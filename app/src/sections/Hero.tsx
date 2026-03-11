import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Users, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/api';

interface HeroProps {
  openAuth: (mode: 'login' | 'register') => void;
}

interface PublicStats {
  usersCount: number;
  activeBoostingUsers: number;
  totalHoursBoosted: number;
  runningPlans: number;
  gamesBoosting: number;
  totalBoostedMinutes: number;
}

const defaultStats: PublicStats = {
  usersCount: 0,
  activeBoostingUsers: 0,
  totalHoursBoosted: 0,
  runningPlans: 0,
  gamesBoosting: 0,
  totalBoostedMinutes: 0,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.max(0, Math.round(value)));
}

export default function Hero({ openAuth }: HeroProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<PublicStats>(defaultStats);

  useEffect(() => {
    apiRequest<PublicStats>('/public/stats')
      .then((payload) => setStats(payload))
      .catch(() => {
        // Keep zeros if API fails.
      });
  }, []);

  const topStats = [
    { value: formatNumber(stats.activeBoostingUsers), label: t('hero.stats.users'), icon: Users },
    { value: formatNumber(stats.totalHoursBoosted), label: t('hero.stats.hours'), icon: Zap },
    { value: `${formatNumber(stats.runningPlans)}`, label: t('dashboard.stats.plansRunning'), icon: Activity },
    { value: `${formatNumber(stats.gamesBoosting)}`, label: t('dashboard.stats.gamesBoosting'), icon: Shield },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
          >
            <span className="text-white">{t('hero.title')}</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-16"
          >
            <Button
              size="lg"
              onClick={() => openAuth('register')}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          >
            {topStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="glass rounded-2xl p-4"
              >
                <stat.icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
