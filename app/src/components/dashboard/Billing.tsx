import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Copy, RefreshCw, CheckCircle2, Hourglass, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { plans } from '@/data/plans';
import type { PlanType } from '@/types';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

interface Quote {
  plan: string;
  accounts: number;
  subtotal: number;
  discount: number;
  total: number;
  providerAmount: number;
  providerCurrency: string;
  providerAvailable: boolean;
  coupon: { code: string; type: 'percent' | 'fixed'; value: number } | null;
}

interface Receipt {
  invoiceId: string;
  status: string;
  plan: string;
  accounts: number;
  subtotal: number;
  discount: number;
  total: number;
  quoteCurrency: string;
  paymentAmount: number;
  paymentCurrency: string;
  couponCode: string | null;
  paymentMethod: string;
  productUrl: string | null;
  providerOrderId: string | null;
  providerPaidAt: string | null;
  createdAt: string;
  redeemCode: {
    code: string;
    status: string;
    redeemedAt: string | null;
    redeemedBy: string | null;
  } | null;
}

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice') || '';
  const requestedPlan = searchParams.get('plan');
  const paidPlans = plans.filter((plan) => plan.id !== 'free');
  const defaultPlan = paidPlans.find((item) => item.id === requestedPlan)?.id || (invoiceId ? 'lifetime' : paidPlans[0]?.id) || 'lifetime';
  const [plan, setPlan] = useState<PlanType>(defaultPlan as PlanType);
  const [accounts, setAccounts] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const lastReceiptStatus = useRef<string | null>(null);

  const selectedPlan = useMemo(() => paidPlans.find((item) => item.id === plan) || paidPlans[0], [paidPlans, plan]);

  useEffect(() => {
    if (!invoiceId && requestedPlan && paidPlans.some((item) => item.id === requestedPlan)) {
      setPlan(requestedPlan as PlanType);
    }
  }, [invoiceId, requestedPlan, paidPlans]);

  const fetchQuote = async (silent = false) => {
    if (!invoiceId && !silent) {
      setLoading(true);
    }
    try {
      const payload = await apiRequest<{ quote: Quote }>('/billing/quote', {
        method: 'POST',
        body: JSON.stringify({ plan, accounts, couponCode }),
      });
      setQuote(payload.quote);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Quote request failed');
      }
    } finally {
      if (!invoiceId && !silent) {
        setLoading(false);
      }
    }
  };

  const loadReceipt = async (currentInvoiceId: string, silent = false) => {
    if (!currentInvoiceId) return null;
    if (!silent) setLoading(true);
    try {
      const payload = await apiRequest<{ receipt: Receipt }>(`/billing/receipt/${currentInvoiceId}`);
      setReceipt(payload.receipt);
      if (silent && lastReceiptStatus.current && lastReceiptStatus.current !== payload.receipt.status) {
        if (payload.receipt.status === 'paid') {
          toast.success('Payment confirmed. Redeem key is ready.');
        }
        if (payload.receipt.status === 'redeemed') {
          toast.success('Purchase redeemed successfully.');
        }
      }
      lastReceiptStatus.current = payload.receipt.status;
      return payload.receipt;
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Receipt load failed');
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      void loadReceipt(invoiceId, true);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchQuote(true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [invoiceId, plan, accounts, couponCode]);

  useEffect(() => {
    if (!receipt || !invoiceId) return undefined;
    if (!['pending'].includes(receipt.status)) return undefined;

    const interval = window.setInterval(() => {
      void loadReceipt(invoiceId, true);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [invoiceId, receipt?.status]);

  useEffect(() => {
    if (receipt?.status) {
      lastReceiptStatus.current = receipt.status;
    }
  }, [receipt?.status]);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<{
        invoiceId: string;
        checkoutUrl: string;
        receiptUrl: string;
        quote: Quote;
        provider: { name: string; amount: number; currency: string };
      }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, accounts, couponCode }),
      });

      setQuote(payload.quote);
      setSearchParams({ invoice: payload.invoiceId });
      setReceipt({
        invoiceId: payload.invoiceId,
        status: 'pending',
        plan,
        accounts,
        subtotal: payload.quote.subtotal,
        discount: payload.quote.discount,
        total: payload.quote.total,
        quoteCurrency: 'USD',
        paymentAmount: payload.provider.amount,
        paymentCurrency: payload.provider.currency,
        couponCode: payload.quote.coupon?.code || null,
        paymentMethod: 'shopier',
        productUrl: payload.checkoutUrl,
        providerOrderId: null,
        providerPaidAt: null,
        createdAt: new Date().toISOString(),
        redeemCode: null,
      });

      const popup = window.open(payload.checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      toast.success('Shopier payment window opened.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (currentInvoiceId = invoiceId, silent = false) => {
    if (!currentInvoiceId) return;
    if (!silent) setVerifying(true);
    try {
      const payload = await apiRequest<{ receipt: Receipt }>('/billing/verify', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: currentInvoiceId }),
      });
      setReceipt(payload.receipt);
      if (!silent) {
        toast.success(payload.receipt.redeemCode ? 'Payment confirmed. Redeem key generated.' : 'Payment confirmed.');
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Payment verification failed');
      }
    } finally {
      if (!silent) setVerifying(false);
    }
  };

  const copyRedeemCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Redeem key copied.');
    } catch {
      toast.error('Failed to copy key.');
    }
  };

  if (invoiceId) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white">Shopier Receipt</h1>
          <p className="text-slate-400">Complete your payment in Shopier, then verify and redeem your key here.</p>
        </motion.div>

        <div className="grid xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 glass rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Invoice</p>
                <p className="text-white font-semibold">{invoiceId}</p>
              </div>
              <Badge className={
                receipt?.status === 'redeemed'
                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                  : receipt?.status === 'paid'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }>
                {receipt?.status || 'pending'}
              </Badge>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                {receipt?.status === 'redeemed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <Hourglass className="w-5 h-5 text-amber-300 mt-0.5" />
                )}
                <div>
                  <h3 className="text-white font-semibold">
                    {receipt?.status === 'redeemed' ? 'Purchase completed and key redeemed' : 'Waiting for Shopier confirmation'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {receipt?.status === 'redeemed'
                      ? 'Your subscription is active. The receipt and key history remain below.'
                      : 'Pay in the Shopier window, return to this page, and wait. The site checks for payment updates automatically and will generate your redeem key.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => receipt?.productUrl && window.open(receipt.productUrl, '_blank', 'noopener,noreferrer')}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                >
                  Open Shopier Payment
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button type="button" variant="outline" disabled={verifying} onClick={() => verifyPayment()}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                  Verify Payment
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard/redeem')}>
                  <Ticket className="w-4 h-4 mr-2" />
                  Go to Redeem
                </Button>
              </div>
            </div>

            {receipt?.redeemCode && (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5 space-y-4">
                <div>
                  <p className="text-sm text-green-300">Redeem Key</p>
                  <p className="text-2xl font-bold tracking-[0.25em] text-white">{receipt.redeemCode.code}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => copyRedeemCode(receipt.redeemCode!.code)} className="bg-white text-slate-900 hover:bg-slate-200">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Key
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/dashboard/redeem')}>
                    Redeem This Key
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-4 space-y-4">
            <div className="glass rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-3">Receipt Summary</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between"><span>Plan</span><span>{receipt?.plan || '-'}</span></div>
                <div className="flex justify-between"><span>Accounts</span><span>{receipt?.accounts || '-'}</span></div>
                <div className="flex justify-between"><span>Quoted Total</span><span>${receipt?.total?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Shopier Charge</span><span>{receipt ? `${receipt.paymentAmount.toFixed(2)} ${receipt.paymentCurrency}` : '-'}</span></div>
                <div className="flex justify-between"><span>Coupon</span><span>{receipt?.couponCode || '-'}</span></div>
                <div className="flex justify-between"><span>Provider Order</span><span>{receipt?.providerOrderId || '-'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Shopier Checkout</h1>
        <p className="text-slate-400">Only Shopier is enabled. After payment, a redeem key will be generated for your plan.</p>
      </motion.div>

      <div className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 glass rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-sm text-white mb-2">Plan</p>
            <select value={plan} onChange={(event) => setPlan(event.target.value as PlanType)} className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white">
              {paidPlans.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - ${item.price}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <p className="text-sm text-violet-200 mb-3">Account quantity</p>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setAccounts((current) => Math.max(1, current - 1))}>-</Button>
              <div className="text-2xl font-bold text-white">{accounts}</div>
              <Button type="button" variant="outline" onClick={() => setAccounts((current) => Math.min(10, current + 1))}>+</Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="bg-white/5 border-white/10 text-white"
            />
            <Button type="button" variant="outline" onClick={() => fetchQuote(false)}>Apply</Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-semibold">Shopier</p>
                <p className="text-sm text-slate-400">Hosted checkout. Payment confirmation will generate a redeem key.</p>
              </div>
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">Only method</Badge>
            </div>
            <Button
              type="button"
              onClick={startCheckout}
              disabled={loading || !quote?.providerAvailable}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            >
              Open Shopier Checkout
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            {!quote?.providerAvailable && (
              <p className="text-sm text-amber-300">This plan is not configured for Shopier yet.</p>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="glass rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3">Summary</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p>{selectedPlan?.name}</p>
              <p>{accounts} {accounts > 1 ? 'Account Slots' : 'Account Slot'}</p>
              <p>{Number.isFinite(selectedPlan?.hoursPerGame) ? selectedPlan.hoursPerGame : 'Unlimited'} Hours per Game</p>
              <p>{selectedPlan?.maxGames} Game Limit</p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${quote?.subtotal?.toFixed(2) ?? '-'}</span></div>
              <div className="flex justify-between text-slate-400"><span>Discount</span><span>-{`$${quote?.discount?.toFixed(2) ?? '0.00'}`}</span></div>
              <div className="flex justify-between text-white font-semibold text-lg"><span>Plan Value</span><span>${quote?.total?.toFixed(2) ?? '-'}</span></div>
              <div className="flex justify-between text-violet-200 font-semibold"><span>Shopier Charge</span><span>{quote ? `${quote.providerAmount.toFixed(2)} ${quote.providerCurrency}` : '-'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
