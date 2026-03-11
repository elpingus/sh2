import { motion } from 'framer-motion';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISCORD_URL = 'https://discord.gg/nxn3ZGWbFS';

export default function SupportPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white">{t('support.title')}</h1>
        <p className="text-slate-400">{t('support.subtitle')}</p>
      </motion.div>

      <motion.a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 hover:bg-white/10 transition-all"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">Discord</h2>
          <p className="text-sm text-slate-400">Join the support server for direct help and updates.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-300 group-hover:translate-x-1 transition-all" />
      </motion.a>
    </div>
  );
}
