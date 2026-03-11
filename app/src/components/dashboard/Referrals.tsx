import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Gift, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { getDashboardCopy } from '@/lib/dashboardI18n';

interface ReferralStats {
  totalReferred: number;
  paidReferred: number;
  availableRewards: number;
  referralCode: string;
  referralUrl: string;
  referralText: string;
}

export default function Referrals() {
  const { i18n } = useTranslation();
  const copy = getDashboardCopy(i18n.resolvedLanguage || i18n.language).referrals;
  const [copied, setCopied] = useState<'url' | 'text' | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const payload = await apiRequest<{ stats: ReferralStats }>('/referrals/overview');
      setStats(payload.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyToClipboard = (text: string, type: 'url' | 'text') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(copy.copy);
    setTimeout(() => setCopied(null), 2000);
  };

  const claimReward = async () => {
    try {
      await apiRequest('/referrals/claim', { method: 'POST' });
      toast.success('Reward claimed: 600 hours');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Claim failed');
    }
  };

  if (loading || !stats) {
    return <p className="text-slate-400">{copy.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{copy.title}</h1>
        <p className="text-slate-400">{copy.subtitle}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">{copy.yourStats}</h3>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{stats.availableRewards} {copy.available}</Badge>
            <Button variant="outline" size="sm" disabled={stats.availableRewards === 0} onClick={claimReward} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-50">
              <Gift className="w-4 h-4 mr-2" />
              {copy.claimReward}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-violet-400" /></div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.totalReferred}</p>
                <p className="text-sm text-slate-400">{copy.referredUsers}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><CreditCard className="w-5 h-5 text-green-400" /></div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.paidReferred}</p>
                <p className="text-sm text-slate-400">{copy.paidReferredUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 glass rounded-xl">
          <p className="text-slate-300 text-sm leading-relaxed">
            {copy.howItWorks}
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{copy.yourReferralUrl}</h3>
        <div className="flex gap-3">
          <div className="flex-1 px-4 py-3 glass rounded-xl text-slate-300 text-sm truncate">{stats.referralUrl}</div>
          <Button onClick={() => copyToClipboard(stats.referralUrl, 'url')} variant="outline" className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
            {copied === 'url' ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}{copy.copy}
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{copy.referralText}</h3>
        <div className="relative">
          <textarea readOnly value={stats.referralText} rows={4} className="w-full px-4 py-3 glass rounded-xl text-slate-300 text-sm resize-none bg-transparent" />
          <Button onClick={() => copyToClipboard(stats.referralText, 'text')} variant="outline" size="sm" className="absolute bottom-3 right-3 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
            {copied === 'text' ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}{copy.copy}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
