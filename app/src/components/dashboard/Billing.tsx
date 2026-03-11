import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { plans } from '@/data/plans';
import { Minus, Plus, ArrowRight, CreditCard, Landmark, Wallet, Coins } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getDashboardCopy } from '@/lib/dashboardI18n';

interface Quote {
  plan: string;
  accounts: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string; type: 'percent' | 'fixed'; value: number } | null;
}

export default function Billing() {
  const { i18n } = useTranslation();
  const copy = getDashboardCopy(i18n.resolvedLanguage || i18n.language).billing;
  const { refreshUser } = useAuth();
  const paidPlans = plans.filter((p) => p.id !== 'free');
  const [step, setStep] = useState<1 | 2>(1);
  const [plan, setPlan] = useState(paidPlans[0]?.id || 'basic');
  const [accounts, setAccounts] = useState(1);
  const [country, setCountry] = useState('Turkey');
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(() => paidPlans.find((p) => p.id === plan) || paidPlans[0], [plan, paidPlans]);

  const fetchQuote = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const payload = await apiRequest<{ quote: Quote }>('/billing/quote', {
        method: 'POST',
        body: JSON.stringify({ plan, accounts, couponCode }),
      });
      setQuote(payload.quote);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Quote failed');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote(true);
    }, 220);

    return () => clearTimeout(timer);
  }, [plan, accounts, couponCode]);

  const continueToPayment = async () => {
    await fetchQuote();
    setStep(2);
  };

  const checkout = async (method: 'card' | 'bank' | 'paypal' | 'crypto') => {
    setLoading(true);
    try {
      const payload = await apiRequest<{ checkoutUrl: string; invoiceId: string; quote: Quote }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, accounts, couponCode, paymentMethod: method }),
      });

      await apiRequest('/billing/activate', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: payload.invoiceId }),
      });
      await refreshUser();
      toast.success('Redirecting to payment...');
      window.open(payload.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{copy.checkout}</h1>
        <p className="text-slate-400">{copy.subtitle}</p>
      </motion.div>

      <div className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 glass rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-1">{selectedPlan?.name} {copy.planSuffix}</h2>
            <p className="text-slate-400">{copy.stepLabel}</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white mb-2">{copy.plan}</p>
                <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white">
                  {paidPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ${p.price}/month</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm text-white mb-2">{copy.country}</p>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white">
                  <option>{copy.turkey}</option>
                  <option>{copy.unitedStates}</option>
                  <option>{copy.germany}</option>
                  <option>{copy.unitedKingdom}</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/10">
                <p className="text-sm text-violet-200 mb-3">{copy.accountScaling}</p>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-slate-200" onClick={() => setAccounts((n) => Math.max(1, n - 1))}><Minus className="w-4 h-4" /></Button>
                  <div className="text-white text-2xl font-bold">{accounts}</div>
                  <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-slate-200" onClick={() => setAccounts((n) => Math.min(10, n + 1))}><Plus className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">{copy.accountLimitHint}</p>
              </div>

              <div className="flex gap-2">
                <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder={copy.promoCode} className="bg-white/5 border-white/10 text-white" />
                <Button onClick={() => fetchQuote(false)} variant="outline" className="border-white/10 bg-white/5 text-slate-300">{copy.apply}</Button>
              </div>

              <Button onClick={continueToPayment} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                {copy.continueToPayment}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {[
                { id: 'card', title: copy.debitCard, icon: CreditCard },
                { id: 'bank', title: copy.localBank, icon: Landmark },
                { id: 'paypal', title: copy.paypal, icon: Wallet },
                { id: 'crypto', title: copy.crypto, icon: Coins },
              ].map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-medium flex items-center gap-2"><m.icon className="w-4 h-4 text-violet-300" />{m.title}</div>
                    {m.id === 'card' && <span className="text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded">{copy.recommended}</span>}
                  </div>
                  <Button onClick={() => { checkout(m.id as any); }} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                    {copy.payWith.replace('{{method}}', m.title)}
                  </Button>
                </div>
              ))}

              <Button variant="outline" className="w-full border-white/10 bg-white/5 text-slate-300" onClick={() => setStep(1)}>
                {copy.backToPurchase}
              </Button>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="glass rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-3">{copy.summary}</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p>{selectedPlan?.name} {copy.planSuffix}</p>
              <p>{accounts} {accounts > 1 ? copy.accountSlots : copy.accountSlot}</p>
              <p>{selectedPlan?.hoursPerGame} {copy.hoursPerGame}</p>
              <p>{selectedPlan?.maxGames} {copy.gameLimit}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>{copy.subtotal}</span><span>${quote?.subtotal?.toFixed(2) ?? '-'}</span></div>
              <div className="flex justify-between text-slate-400">
                <span>{copy.discount} {quote?.coupon?.code ? `(${quote.coupon.code})` : ''}</span>
                <span className={quote?.discount ? 'text-green-300' : ''}>-{`$${quote?.discount?.toFixed(2) ?? '0.00'}`}</span>
              </div>
              <div className="flex justify-between text-white font-semibold text-lg"><span>{copy.total}</span><span>${quote?.total?.toFixed(2) ?? '-'}</span></div>
            </div>
            {quote?.coupon && <p className="mt-2 text-xs text-green-300">{copy.couponApplied.replace('{{code}}', quote.coupon.code).replace('{{value}}', quote.coupon.type === 'percent' ? `${quote.coupon.value}%` : `$${quote.coupon.value}`)}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
