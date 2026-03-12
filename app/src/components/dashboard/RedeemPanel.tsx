import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Receipt {
  invoiceId: string;
  status: string;
  plan: string;
  accounts: number;
  paymentAmount: number;
  paymentCurrency: string;
  providerPaidAt: string | null;
  redeemCode: {
    code: string;
    status: string;
    redeemedAt: string | null;
    redeemedBy: string | null;
  } | null;
}

export default function RedeemPanel() {
  const { refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Receipt[]>([]);

  const loadHistory = async () => {
    try {
      const payload = await apiRequest<{ purchases: Receipt[] }>('/billing/history');
      setHistory(payload.purchases.filter((item) => Boolean(item.redeemCode)));
    } catch {
      // Ignore silent load errors here.
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const redeem = async () => {
    if (!code.trim()) {
      toast.error('Redeem code required.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/billing/redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      await refreshUser();
      await loadHistory();
      toast.success('Redeem successful. Your plan is now active.');
      setCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Key copied.');
    } catch {
      toast.error('Copy failed.');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Redeem</h1>
        <p className="text-slate-400">Activate Shopier purchases by redeeming the generated key.</p>
      </motion.div>

      <div className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 glass rounded-2xl p-6 space-y-4">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-violet-300 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold">Activate Key</h3>
                <p className="text-sm text-slate-400">Paste your Shopier redeem key to activate the purchased plan on this account.</p>
              </div>
            </div>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="bg-white/5 border-white/10 text-white tracking-[0.2em]"
            />
            <Button type="button" disabled={loading} onClick={redeem} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
              Redeem Key
            </Button>
          </div>
        </div>

        <div className="xl:col-span-7 glass rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-white font-semibold">Your Keys</h3>
            <p className="text-sm text-slate-400">Paid Shopier receipts and generated redeem codes.</p>
          </div>

          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.invoiceId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">{item.plan} / {item.accounts} account</p>
                    <p className="text-sm text-slate-400">{item.paymentAmount.toFixed(2)} {item.paymentCurrency}</p>
                  </div>
                  <Badge className={item.redeemCode?.status === 'redeemed' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-violet-500/20 text-violet-300 border-violet-500/30'}>
                    {item.redeemCode?.status || item.status}
                  </Badge>
                </div>
                {item.redeemCode && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white tracking-[0.25em] text-sm">
                      {item.redeemCode.code}
                    </div>
                    <Button type="button" variant="outline" onClick={() => copyCode(item.redeemCode!.code)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    {item.redeemCode.status === 'redeemed' && (
                      <span className="inline-flex items-center gap-2 text-sm text-green-300">
                        <CheckCircle2 className="w-4 h-4" />
                        Redeemed
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {history.length === 0 && (
              <p className="text-sm text-slate-500">No redeemable Shopier purchases yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
