import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

export default function Support() {
  const { t } = useTranslation();

  return (
    <section id="support" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/10 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">{t('support.title')}</h2>
          <p className="text-xl text-slate-400">{t('support.subtitle')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-3"
        >
          <motion.a
            href="https://discord.gg/nxn3ZGWbFS"
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex items-center gap-4 p-4 glass rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold group-hover:text-violet-400 transition-colors">
                Discord Support
              </h3>
              <p className="text-sm text-slate-400">
                Join the official Discord server for account help, plan questions, relogin issues and live support.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-500">
            Discord support is the primary help channel. Account and payment issues are handled there.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
