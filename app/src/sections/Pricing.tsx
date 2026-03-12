import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { plans } from '@/data/plans';
import { Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface PricingProps {
  openAuth: (mode: 'login' | 'register') => void;
}

export default function Pricing({ openAuth }: PricingProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const highlighted = plans.find((p) => p.popular) || plans[3] || plans[0];
  const sidePlans = plans.filter((p) => p.id !== highlighted.id);

  const startPurchase = (planId: string) => {
    const redirectTarget = `/dashboard/billing?plan=${encodeURIComponent(planId)}`;
    if (isAuthenticated) {
      navigate(redirectTarget);
      return;
    }

    sessionStorage.setItem('post_auth_redirect', redirectTarget);
    openAuth('register');
  };

  return (
    <section id="pricing" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute top-16 right-10 w-[420px] h-[420px] bg-violet-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-6 w-[460px] h-[460px] bg-purple-500/10 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-violet-300 text-sm uppercase tracking-[0.2em] mb-3">Pricing</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {t('pricing.title')} <span className="text-violet-300">{t('pricing.titleHighlight')}</span>
              </h2>
              <p className="text-slate-400 mt-3 max-w-2xl">{t('pricing.subtitle')}</p>
            </div>
            <div className="glass rounded-xl px-4 py-3 border border-violet-500/20">
              <p className="text-sm text-slate-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-400" />Secure payments, instant activation</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-6">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="lg:col-span-5 xl:col-span-4">
            <div className="h-full rounded-3xl border border-violet-500/40 bg-gradient-to-b from-violet-500/20 via-violet-500/10 to-slate-900/80 p-6 lg:p-8 shadow-[0_0_60px_rgba(139,92,246,0.2)]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/25 text-violet-200 text-xs font-semibold uppercase tracking-wider mb-5">
                <Sparkles className="w-3.5 h-3.5" /> Most Popular
              </div>

              <p className="text-slate-300 text-sm mb-2">{highlighted.name}</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-white">${highlighted.price}</span>
                <span className="text-slate-400 pb-1">one-time</span>
              </div>
              <p className="text-slate-300 mb-5">{highlighted.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Hours</p>
                  <p className="text-xl font-bold text-violet-300">{Number.isFinite(highlighted.hoursPerGame) ? highlighted.hoursPerGame.toLocaleString() : '?'}h</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Games</p>
                  <p className="text-xl font-bold text-purple-300">{highlighted.maxGames}</p>
                </div>
              </div>

              <div className="space-y-3 mb-7">
                {highlighted.features.filter((f) => f.included).slice(0, 6).map((feature) => (
                  <div key={feature.name} className="flex items-center gap-3 text-slate-200 text-sm">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center"><Check className="w-3 h-3 text-violet-300" /></span>
                    {feature.name}
                  </div>
                ))}
              </div>

              <Button onClick={() => startPurchase(highlighted.id)} className="w-full h-12 text-base bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                {t('pricing.purchase')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          <div className="lg:col-span-7 xl:col-span-8 grid sm:grid-cols-2 gap-4">
            {sidePlans.map((plan, index) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.05 }} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 hover:border-violet-400/40 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-lg font-bold text-white">{plan.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{plan.price === 0 ? 'Free' : `$${plan.price}`}</p>
                    <p className="text-xs text-slate-500">one-time</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 rounded-md bg-violet-500/15 text-violet-300 text-xs">{Number.isFinite(plan.hoursPerGame) ? `${plan.hoursPerGame}h` : '? hours'}</span>
                  <span className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-300 text-xs">{plan.maxGames} games</span>
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.slice(0, 4).map((feature) => (
                    <div key={feature.name} className={`text-sm flex items-center gap-2 ${feature.included ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${feature.included ? 'bg-violet-500/15 text-violet-300' : 'bg-white/5 text-slate-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </span>
                      {feature.name}
                    </div>
                  ))}
                </div>

                <Button onClick={() => (plan.id === 'free' ? openAuth('register') : startPurchase(plan.id))} variant="outline" className="w-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10">
                  {plan.id === 'free' ? t('pricing.getStarted') : t('pricing.purchase')}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
