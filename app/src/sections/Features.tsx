import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Gamepad2,
  CreditCard,
  Cloud,
  UserCircle,
  MessageSquare,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Type,
  Gamepad2,
  CreditCard,
  Cloud,
  UserCircle,
  MessageSquare,
  RefreshCw,
  UserPlus,
};

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);
  const { t } = useTranslation();

  const features = [
    { id: 'customTitle', icon: 'Type' },
    { id: 'gameLimit', icon: 'Gamepad2' },
    { id: 'cardFarmer', icon: 'CreditCard' },
    { id: 'alwaysOn', icon: 'Cloud' },
    { id: 'customAppearance', icon: 'UserCircle' },
    { id: 'awayMessage', icon: 'MessageSquare' },
    { id: 'autoRestart', icon: 'RefreshCw' },
    { id: 'autoFriend', icon: 'UserPlus' },
  ];

  const currentFeature = features[activeFeature];
  const CurrentIcon = iconMap[currentFeature.icon] || Type;

  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="text-violet-400 text-sm font-semibold tracking-wider uppercase mb-4 block">
            {t('features.subtitle')}
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl">
            {t('features.description')}
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {features.map((feature, index) => {
              const FeatureIcon = iconMap[feature.icon] || Type;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => setActiveFeature(index)}
                  className={`group cursor-pointer p-4 rounded-xl border transition-all duration-300 ${
                    index === activeFeature
                      ? 'bg-violet-500/10 border-violet-500/50'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      index === activeFeature
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/10 text-slate-400 group-hover:text-white'
                    }`}>
                      <FeatureIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-1 transition-colors ${
                        index === activeFeature ? 'text-violet-400' : 'text-white'
                      }`}>
                        {t(`features.${feature.id}`)}
                      </h4>
                      <p className="text-sm text-slate-400 line-clamp-2">{t(`features.${feature.id}Desc`)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            key={currentFeature.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="glass-strong rounded-2xl p-6 lg:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <CurrentIcon className="w-6 h-6 text-violet-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.24em] uppercase text-violet-300/80 mb-2">
                  Feature Details
                </p>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {t(`features.${currentFeature.id}`)}
                </h3>
                <p className="text-base text-slate-300 leading-7 max-w-3xl">
                  {t(`features.${currentFeature.id}Desc`)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
