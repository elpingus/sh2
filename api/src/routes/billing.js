const { randomUUID } = require('crypto');
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readDb, updateDb } = require('../lib/db');
const { getPlanLimits } = require('../lib/plans');
const { logAuditFromRequest } = require('../services/auditLog');

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

  return {
    plan,
    accounts: qty,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2)),
    coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
  };
}

function billingRoutes() {
  const router = express.Router();
  router.use(requireAuth);

  router.post('/quote', (req, res) => {
    const { plan, accounts, couponCode } = req.body || {};
    if (!plan || !PLAN_BASE[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    return res.json({ quote: computeQuote(plan, accounts, couponCode) });
  });

  router.post('/checkout', async (req, res) => {
    const { plan, accounts, couponCode, paymentMethod } = req.body || {};
    if (!plan || !PLAN_BASE[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const quote = computeQuote(plan, accounts, couponCode);
    const invoiceId = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;

    await updateDb((current) => {
      current.purchases.push({
        id: invoiceId,
        userId: req.auth.user.id,
        plan,
        accounts: quote.accounts,
        total: quote.total,
        subtotal: quote.subtotal,
        discount: quote.discount,
        couponCode: quote.coupon?.code || null,
        paymentMethod: paymentMethod || 'card',
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
        total: quote.total,
        paymentMethod: paymentMethod || 'card',
      },
    });

    const checkoutBase = process.env.STRIPE_CHECKOUT_URL || 'https://checkout.stripe.com';

    return res.json({
      invoiceId,
      checkoutUrl: `${checkoutBase}?prefilled_email=${encodeURIComponent(req.auth.user.email)}&client_reference_id=${invoiceId}`,
      quote,
    });
  });

  router.post('/activate', async (req, res) => {
    const { invoiceId } = req.body || {};
    if (!invoiceId) {
      return res.status(400).json({ message: 'invoiceId required' });
    }

    const db = readDb();
    const purchase = db.purchases.find((p) => p.id === invoiceId && p.userId === req.auth.user.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const limits = getPlanLimits(purchase.plan);
    const months = purchase.plan === 'lifetime' ? 1200 : 1;
    const expiresAt = purchase.plan === 'lifetime'
      ? null
      : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    await updateDb((current) => {
      const purchaseIdx = current.purchases.findIndex((p) => p.id === invoiceId);
      if (purchaseIdx !== -1) {
        current.purchases[purchaseIdx].status = 'paid';
      }

      const userIdx = current.users.findIndex((u) => u.id === req.auth.user.id);
      if (userIdx !== -1) {
        current.users[userIdx].plan = purchase.plan;
        current.users[userIdx].maxGames = limits.maxGames;
        current.users[userIdx].hoursLeft = Math.max(current.users[userIdx].hoursLeft, limits.hours);
        const existingSlots = Number(current.users[userIdx].steamAccountSlots) || 1;
        current.users[userIdx].steamAccountSlots = Math.max(existingSlots, Number(purchase.accounts) || 1);
        current.users[userIdx].subscription = {
          plan: purchase.plan,
          accounts: purchase.accounts,
          expiresAt,
          status: 'active',
        };
      }
      return current;
    });
    await logAuditFromRequest(req, {
      action: 'billing_activate',
      targetType: 'invoice',
      targetId: invoiceId,
      meta: {
        plan: purchase.plan,
        accounts: purchase.accounts,
        total: purchase.total,
      },
    });

    return res.json({ ok: true });
  });

  return router;
}

module.exports = {
  billingRoutes,
};
