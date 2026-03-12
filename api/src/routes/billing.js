const { randomUUID, createHmac } = require('crypto');
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readDb, updateDb } = require('../lib/db');
const { getPlanLimits } = require('../lib/plans');
const { logAuditFromRequest } = require('../services/auditLog');
const {
  getConfiguredShopierProduct,
  verifyPurchaseWithShopier,
  extractWebhookOrder,
  extractOrderEmail,
  extractOrderAmount,
  extractOrderCurrency,
  extractOrderId,
  findMatchingPurchase,
  isPaidStatus,
} = require('../services/shopier');

const PLAN_BASE = {
  basic: 0.99,
  plus: 1.99,
  premium: 3.99,
  ultimate: 9.99,
  lifetime: 25,
};

function computeQuote(plan, accounts, couponCode) {
  const base = PLAN_BASE[plan] || 0;
  const qty = Math.max(1, Math.min(10, Number(accounts) || 1));
  const subtotal = base + (qty - 1) * 1;

  const db = readDb();
  const code = String(couponCode || '').trim().toUpperCase();
  let coupon = null;
  if (code) {
    coupon = db.coupons.find((c) => {
      if (c.code !== code || !c.active) {
        return false;
      }
      if (!c.expiresAt) {
        return true;
      }
      const expiresAt = new Date(c.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > Date.now();
    });
  }

  let discount = 0;
  if (coupon) {
    if (coupon.type === 'percent') {
      discount = (subtotal * Number(coupon.value || 0)) / 100;
    } else {
      discount = Number(coupon.value || 0);
    }
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  const total = Math.max(0, subtotal - discount);
  const shopierProduct = getConfiguredShopierProduct(plan);

  return {
    plan,
    accounts: qty,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2)),
    coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
    paymentProvider: 'shopier',
    providerAmount: shopierProduct?.chargeAmount ?? Number(total.toFixed(2)),
    providerCurrency: shopierProduct?.chargeCurrency || 'USD',
    providerAvailable: Boolean(shopierProduct?.productUrl),
  };
}

function generateRedeemCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

function formatHoursLeft(value, plan) {
  if (plan === 'lifetime') {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(value) || 0;
}

function applyPurchaseToUser(user, purchase) {
  const limits = getPlanLimits(purchase.plan);
  const expiresAt = purchase.plan === 'lifetime'
    ? null
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const existingSlots = Number(user.steamAccountSlots) || 1;

  return {
    ...user,
    plan: purchase.plan,
    maxGames: limits.maxGames,
    hoursLeft: formatHoursLeft(Math.max(Number(user.hoursLeft) || 0, limits.hours), purchase.plan),
    steamAccountSlots: Math.max(existingSlots, Number(purchase.accounts) || 1),
    subscription: {
      plan: purchase.plan,
      accounts: purchase.accounts,
      expiresAt,
      status: 'active',
      provider: 'shopier',
    },
  };
}

function buildReceipt(purchase, redeemCode = null) {
  return {
    invoiceId: purchase.id,
    status: purchase.status,
    plan: purchase.plan,
    accounts: purchase.accounts,
    subtotal: purchase.subtotal,
    discount: purchase.discount,
    total: purchase.total,
    quoteCurrency: purchase.quoteCurrency || 'USD',
    paymentAmount: purchase.paymentAmount ?? purchase.total,
    paymentCurrency: purchase.paymentCurrency || purchase.quoteCurrency || 'USD',
    couponCode: purchase.couponCode || null,
    paymentMethod: purchase.paymentMethod || 'shopier',
    productUrl: purchase.productUrl || null,
    providerOrderId: purchase.providerOrderId || null,
    providerPaidAt: purchase.providerPaidAt || null,
    redeemCode: redeemCode
      ? {
          code: redeemCode.code,
          status: redeemCode.status,
          redeemedAt: redeemCode.redeemedAt || null,
          redeemedBy: redeemCode.redeemedBy || null,
        }
      : null,
    createdAt: purchase.createdAt,
  };
}

function getShopierOsbConfig() {
  return {
    username: String(process.env.SHOPIER_OSB_USERNAME || '').trim(),
    key: String(process.env.SHOPIER_OSB_KEY || '').trim(),
  };
}

async function markPurchasePaid({ purchaseId, verification }) {
  await updateDb((current) => {
    const purchaseIndex = current.purchases.findIndex((item) => item.id === purchaseId);
    if (purchaseIndex === -1) {
      return current;
    }

    current.purchases[purchaseIndex] = {
      ...current.purchases[purchaseIndex],
      status: 'paid',
      providerOrderId: verification.orderId || current.purchases[purchaseIndex].providerOrderId,
      providerPaidAt: verification.paidAt || current.purchases[purchaseIndex].providerPaidAt || new Date().toISOString(),
      paymentAmount: verification.amount ?? current.purchases[purchaseIndex].paymentAmount,
      paymentCurrency: verification.currency || current.purchases[purchaseIndex].paymentCurrency,
    };

    const existingCode = (current.redeemCodes || []).find((code) => code.purchaseId === purchaseId);
    if (!existingCode) {
      const code = generateRedeemCode();
      current.redeemCodes.push({
        id: `RDM-${randomUUID().slice(0, 8).toUpperCase()}`,
        code,
        purchaseId,
        plan: current.purchases[purchaseIndex].plan,
        accounts: current.purchases[purchaseIndex].accounts,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    }

    return current;
  });
}

function billingRoutes() {
  const router = express.Router();

  router.post('/shopier/osb', async (req, res) => {
    try {
      const { username, key } = getShopierOsbConfig();
      const encodedResult = String(req.body?.res || '');
      const receivedHash = String(req.body?.hash || '').trim();

      if (!encodedResult || !receivedHash || !username || !key) {
        return res.status(400).send('missing parameter');
      }

      const expectedHash = createHmac('sha256', key)
        .update(`${encodedResult}${username}`)
        .digest('hex');

      if (expectedHash !== receivedHash) {
        return res.status(400).send('invalid hash');
      }

      const decoded = Buffer.from(encodedResult, 'base64').toString('utf8');
      const order = JSON.parse(decoded);
      const db = readDb();
      const email = String(order?.email || '').trim().toLowerCase();
      const user = (db.users || []).find((item) => String(item.email || '').trim().toLowerCase() === email) || null;
      const purchase = findMatchingPurchase({
        db,
        order: {
          ...order,
          email,
          amount: Number(order?.price),
          currency: String(order?.currency ?? '').trim().toUpperCase(),
          id: order?.orderid,
          products: Array.isArray(order?.productid)
            ? order.productid.map((id) => ({ productId: id }))
            : [{ productId: order?.productid }],
          status: 'paid',
        },
        user,
      });

      // Shopier test ekranının success alması için test bildiriminde purchase bulunmasa bile success dön.
      if (!purchase && String(order?.istest || '0') === '1') {
        return res.status(200).send('success');
      }

      if (!purchase) {
        return res.status(200).send('success');
      }

      if (purchase.status !== 'paid' && purchase.status !== 'redeemed') {
        await markPurchasePaid({
          purchaseId: purchase.id,
          verification: {
            orderId: String(order?.orderid || ''),
            amount: Number(order?.price),
            currency: String(order?.currency ?? purchase.paymentCurrency ?? '').toUpperCase(),
            paidAt: new Date().toISOString(),
          },
        });
      }

      return res.status(200).send('success');
    } catch (error) {
      console.error('[shopier-osb] failed', error);
      return res.status(500).send('error');
    }
  });

  router.post('/shopier/webhook', async (req, res) => {
    try {
      const event = String(req.body?.event || req.body?.type || '').trim().toLowerCase();
      const order = extractWebhookOrder(req.body);
      const status = String(req.body?.status || extractWebhookOrder(req.body)?.status || '').trim().toLowerCase();

      if (!order || (event && event !== 'order.created' && event !== 'order.fulfilled' && event !== 'order.updated')) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const paidStatus = status || String(order?.status || order?.paymentStatus || '').trim().toLowerCase();
      if (!isPaidStatus(paidStatus)) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const db = readDb();
      const email = extractOrderEmail(order);
      const user = (db.users || []).find((item) => String(item.email || '').trim().toLowerCase() === email) || null;
      const purchase = findMatchingPurchase({ db, order, user });

      if (!purchase) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'purchase_not_found' });
      }

      if (purchase.status === 'paid' || purchase.status === 'redeemed') {
        return res.status(200).json({ ok: true, ignored: true, reason: 'already_processed' });
      }

      const verification = {
        orderId: extractOrderId(order),
        amount: extractOrderAmount(order),
        currency: extractOrderCurrency(order) || purchase.paymentCurrency,
        paidAt: new Date().toISOString(),
      };

      await markPurchasePaid({ purchaseId: purchase.id, verification });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[shopier-webhook] failed', error);
      return res.status(200).json({ ok: false });
    }
  });

  router.use(requireAuth);

  router.post('/quote', (req, res) => {
    const { plan, accounts, couponCode } = req.body || {};
    if (!plan || !PLAN_BASE[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    return res.json({ quote: computeQuote(plan, accounts, couponCode) });
  });

  router.get('/history', (req, res) => {
    const db = readDb();
    const purchases = (db.purchases || [])
      .filter((purchase) => purchase.userId === req.auth.user.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((purchase) => {
        const redeemCode = (db.redeemCodes || []).find((code) => code.purchaseId === purchase.id) || null;
        return buildReceipt(purchase, redeemCode);
      });
    return res.json({ purchases });
  });

  router.post('/checkout', async (req, res) => {
    const { plan, accounts, couponCode } = req.body || {};
    if (!plan || !PLAN_BASE[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const shopierProduct = getConfiguredShopierProduct(plan);
    if (!shopierProduct?.productUrl) {
      return res.status(400).json({ message: 'This plan is not configured for Shopier yet.' });
    }

    const quote = computeQuote(plan, accounts, couponCode);
    const invoiceId = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;
    const receiptUrl = `/dashboard/billing?invoice=${encodeURIComponent(invoiceId)}`;

    await updateDb((current) => {
      current.purchases.push({
        id: invoiceId,
        userId: req.auth.user.id,
        plan,
        accounts: quote.accounts,
        total: shopierProduct.chargeAmount ?? quote.total,
        subtotal: quote.subtotal,
        discount: quote.discount,
        quoteTotal: quote.total,
        quoteCurrency: 'USD',
        paymentAmount: shopierProduct.chargeAmount ?? quote.total,
        paymentCurrency: shopierProduct.chargeCurrency || 'USD',
        couponCode: quote.coupon?.code || null,
        paymentMethod: 'shopier',
        provider: 'shopier',
        productUrl: shopierProduct.productUrl,
        productId: shopierProduct.productId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      return current;
    });
    await logAuditFromRequest(req, {
      action: 'billing_checkout_create',
      targetType: 'invoice',
      targetId: invoiceId,
      meta: {
        plan,
        accounts: quote.accounts,
        total: shopierProduct.chargeAmount ?? quote.total,
        paymentMethod: 'shopier',
        productId: shopierProduct.productId,
      },
    });

    return res.json({
      invoiceId,
      checkoutUrl: shopierProduct.productUrl,
      receiptUrl,
      quote,
      provider: {
        name: 'Shopier',
        amount: shopierProduct.chargeAmount ?? quote.total,
        currency: shopierProduct.chargeCurrency || 'USD',
      },
    });
  });

  router.get('/receipt/:invoiceId', (req, res) => {
    const { invoiceId } = req.params;
    const db = readDb();
    const purchase = (db.purchases || []).find((item) => item.id === invoiceId && item.userId === req.auth.user.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    const redeemCode = (db.redeemCodes || []).find((code) => code.purchaseId === purchase.id) || null;
    return res.json({ receipt: buildReceipt(purchase, redeemCode) });
  });

  router.post('/verify', async (req, res) => {
    const { invoiceId } = req.body || {};
    if (!invoiceId) {
      return res.status(400).json({ message: 'invoiceId required' });
    }

    const db = readDb();
    const purchase = (db.purchases || []).find((item) => item.id === invoiceId && item.userId === req.auth.user.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    let redeemCode = (db.redeemCodes || []).find((code) => code.purchaseId === purchase.id) || null;
    if (purchase.status === 'paid' && redeemCode) {
      return res.json({ ok: true, receipt: buildReceipt(purchase, redeemCode) });
    }

    const verification = await verifyPurchaseWithShopier({
      purchase,
      user: req.auth.user,
    });

    if (!verification.ok) {
      return res.status(409).json({ message: verification.message });
    }

    await markPurchasePaid({ purchaseId: invoiceId, verification });

    const latestDb = readDb();
    const latestPurchase = latestDb.purchases.find((item) => item.id === invoiceId && item.userId === req.auth.user.id);
    redeemCode = (latestDb.redeemCodes || []).find((code) => code.purchaseId === invoiceId) || null;

    await logAuditFromRequest(req, {
      action: 'billing_shopier_verified',
      targetType: 'invoice',
      targetId: invoiceId,
      meta: {
        providerOrderId: verification.orderId,
        amount: verification.amount,
        currency: verification.currency,
      },
    });

    return res.json({ ok: true, receipt: buildReceipt(latestPurchase, redeemCode) });
  });

  router.post('/redeem', async (req, res) => {
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ message: 'Redeem code required' });
    }

    const db = readDb();
    const redeemCode = (db.redeemCodes || []).find((item) => item.code === rawCode);
    if (!redeemCode) {
      return res.status(404).json({ message: 'Redeem code not found' });
    }
    if (redeemCode.status !== 'active') {
      return res.status(409).json({ message: 'Redeem code is already used.' });
    }

    const purchase = (db.purchases || []).find((item) => item.id === redeemCode.purchaseId);
    if (!purchase || purchase.status !== 'paid') {
      return res.status(409).json({ message: 'This payment is not confirmed yet.' });
    }

    let updatedUser = null;
    await updateDb((current) => {
      const codeIndex = current.redeemCodes.findIndex((item) => item.code === rawCode);
      const purchaseIndex = current.purchases.findIndex((item) => item.id === redeemCode.purchaseId);
      const userIndex = current.users.findIndex((item) => item.id === req.auth.user.id);
      if (codeIndex === -1 || purchaseIndex === -1 || userIndex === -1) {
        return current;
      }

      current.users[userIndex] = applyPurchaseToUser(current.users[userIndex], current.purchases[purchaseIndex]);
      updatedUser = current.users[userIndex];

      current.redeemCodes[codeIndex] = {
        ...current.redeemCodes[codeIndex],
        status: 'redeemed',
        redeemedAt: new Date().toISOString(),
        redeemedBy: req.auth.user.id,
      };

      current.purchases[purchaseIndex] = {
        ...current.purchases[purchaseIndex],
        status: 'redeemed',
        redeemedAt: new Date().toISOString(),
        redeemedBy: req.auth.user.id,
      };

      return current;
    });

    await logAuditFromRequest(req, {
      action: 'billing_redeem_code',
      targetType: 'redeem_code',
      targetId: rawCode,
      meta: {
        purchaseId: purchase.id,
        plan: purchase.plan,
        accounts: purchase.accounts,
      },
    });

    return res.json({ ok: true, user: updatedUser, purchaseId: purchase.id });
  });

  return router;
}

module.exports = {
  billingRoutes,
};
