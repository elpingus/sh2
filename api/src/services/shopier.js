const SHOPIER_API_BASE = process.env.SHOPIER_API_BASE || 'https://api.shopier.com/v1';

const DEFAULT_PRODUCTS = {
  lifetime: {
    productUrl: 'https://www.shopier.com/steamhoursnetxyz/45169004',
    productId: 45169004,
    chargeAmount: 1,
    chargeCurrency: 'TRY',
  },
};

function getConfiguredShopierProduct(plan) {
  const normalizedPlan = String(plan || '').trim().toLowerCase();
  const envPrefix = `SHOPIER_${normalizedPlan.toUpperCase()}`;
  const fallback = DEFAULT_PRODUCTS[normalizedPlan] || null;
  const productUrl = process.env[`${envPrefix}_PRODUCT_URL`] || fallback?.productUrl || null;
  const productIdRaw = process.env[`${envPrefix}_PRODUCT_ID`] || fallback?.productId || null;
  const chargeAmountRaw = process.env[`${envPrefix}_CHARGE_AMOUNT`] || fallback?.chargeAmount || null;
  const chargeCurrency = String(process.env[`${envPrefix}_CURRENCY`] || fallback?.chargeCurrency || 'TRY').toUpperCase();

  if (!productUrl) {
    return null;
  }

  const productId = productIdRaw ? Number(productIdRaw) : null;
  const chargeAmount = chargeAmountRaw != null ? Number(chargeAmountRaw) : null;

  return {
    plan: normalizedPlan,
    productUrl,
    productId: Number.isFinite(productId) ? productId : null,
    chargeAmount: Number.isFinite(chargeAmount) ? Number(chargeAmount.toFixed(2)) : null,
    chargeCurrency,
  };
}

function getShopierToken() {
  const token = String(process.env.SHOPIER_API_TOKEN || '').trim();
  if (!token) {
    throw new Error('Shopier API token is not configured.');
  }
  return token;
}

function normalizeOrdersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function getNestedValue(target, candidates) {
  for (const candidate of candidates) {
    const parts = candidate.split('.');
    let current = target;
    let found = true;
    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found && current != null) {
      return current;
    }
  }
  return null;
}

function extractOrderEmail(order) {
  const value = getNestedValue(order, [
    'customer.email',
    'buyer.email',
    'billingAddress.email',
    'billing_address.email',
    'shippingAddress.email',
    'shipping_address.email',
    'email',
  ]);
  return value ? String(value).trim().toLowerCase() : null;
}

function extractOrderAmount(order) {
  const value = getNestedValue(order, [
    'totalAmount',
    'total_amount',
    'grandTotal',
    'grand_total',
    'amount',
    'total',
    'price',
  ]);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null;
}

function extractOrderCurrency(order) {
  const value = getNestedValue(order, ['currency', 'currencyCode', 'currency_code']);
  return value ? String(value).trim().toUpperCase() : null;
}

function extractOrderStatus(order) {
  const value = getNestedValue(order, [
    'paymentStatus',
    'payment_status',
    'financialStatus',
    'financial_status',
    'status',
  ]);
  return value ? String(value).trim().toLowerCase() : null;
}

function extractOrderDate(order) {
  const value = getNestedValue(order, [
    'paidAt',
    'paid_at',
    'createdAt',
    'created_at',
    'placedAt',
    'placed_at',
    'updatedAt',
    'updated_at',
  ]);
  const ts = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ts) ? ts : 0;
}

function extractOrderId(order) {
  const value = getNestedValue(order, ['id', 'orderNumber', 'order_number', 'number']);
  return value ? String(value) : null;
}

function extractOrderProductIds(order) {
  const lineItems = getNestedValue(order, ['lineItems', 'line_items', 'products', 'items']);
  if (!Array.isArray(lineItems)) {
    return [];
  }

  return lineItems
    .map((item) => getNestedValue(item, ['productId', 'product_id', 'id']))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function isPaidStatus(status) {
  if (!status) return false;
  return ['paid', 'completed', 'approved', 'success', 'successful'].some((token) => status.includes(token));
}

async function fetchRecentOrders() {
  const token = getShopierToken();
  const response = await fetch(`${SHOPIER_API_BASE}/orders`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Shopier orders request failed with ${response.status}`);
  }

  const payload = await response.json();
  return normalizeOrdersPayload(payload);
}

async function verifyPurchaseWithShopier({ purchase, user }) {
  const shopierProduct = getConfiguredShopierProduct(purchase.plan);
  if (!shopierProduct) {
    return { ok: false, message: 'This plan is not configured for Shopier.' };
  }

  const orders = await fetchRecentOrders();
  const expectedEmail = String(user.email || '').trim().toLowerCase();
  const expectedAmount = Number(shopierProduct.chargeAmount);
  const expectedCurrency = String(shopierProduct.chargeCurrency || 'TRY').toUpperCase();
  const purchaseCreatedAt = new Date(purchase.createdAt || Date.now()).getTime();
  const earliestAcceptedAt = purchaseCreatedAt - 10 * 60 * 1000;

  const match = orders
    .filter((order) => {
      const email = extractOrderEmail(order);
      const amount = extractOrderAmount(order);
      const currency = extractOrderCurrency(order) || expectedCurrency;
      const status = extractOrderStatus(order);
      const orderDate = extractOrderDate(order);
      const productIds = extractOrderProductIds(order);

      if (!isPaidStatus(status)) {
        return false;
      }
      if (email !== expectedEmail) {
        return false;
      }
      if (Number.isFinite(expectedAmount) && amount !== expectedAmount) {
        return false;
      }
      if (expectedCurrency && currency !== expectedCurrency) {
        return false;
      }
      if (shopierProduct.productId && !productIds.includes(shopierProduct.productId)) {
        return false;
      }
      if (orderDate && orderDate < earliestAcceptedAt) {
        return false;
      }
      return true;
    })
    .sort((a, b) => extractOrderDate(b) - extractOrderDate(a))[0];

  if (!match) {
    return { ok: false, message: 'Payment not found yet. Complete the Shopier payment and try again.' };
  }

  return {
    ok: true,
    orderId: extractOrderId(match),
    amount: extractOrderAmount(match),
    currency: extractOrderCurrency(match) || expectedCurrency,
    paidAt: new Date(extractOrderDate(match) || Date.now()).toISOString(),
    raw: match,
  };
}

module.exports = {
  getConfiguredShopierProduct,
  verifyPurchaseWithShopier,
};
