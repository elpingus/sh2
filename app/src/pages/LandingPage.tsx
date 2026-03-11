import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import Pricing from '@/sections/Pricing';
import Reviews from '@/sections/Reviews';
import FAQ from '@/sections/FAQ';
import Support from '@/sections/Support';
import Footer from '@/sections/Footer';
import { useAuth } from '@/contexts/AuthContext';

interface LandingPageProps {
  openAuth: (mode: 'login' | 'register') => void;
  changeLanguage: (lang: string) => void;
  view?: 'home' | 'features' | 'pricing' | 'reviews' | 'faq' | 'support';
}

export default function LandingPage({ openAuth, changeLanguage, view = 'home' }: LandingPageProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleControlPanel = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    openAuth('register');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-950"
    >
      <Navbar openAuth={openAuth} changeLanguage={changeLanguage} />
      <main>
        {view === 'home' && (
          <>
            <Hero openAuth={openAuth} />
            <Features />
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 grid lg:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-4xl font-bold text-white mb-3">Free Plan</h3>
                  <p className="text-slate-300 mb-6">Get started for free, upgrade later.</p>
                  <ul className="grid sm:grid-cols-2 gap-3 text-slate-300">
                    <li>100 Hours</li>
                    <li>1 Game Limit</li>
                    <li>Always-On Boosting</li>
                    <li>Auto-Restarter</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-slate-900/80 p-6">
                  <p className="text-5xl text-white font-extrabold mb-4">Free</p>
                  <button
                    onClick={handleControlPanel}
                    className="w-full rounded-xl bg-violet-500 hover:bg-violet-600 text-white py-3 font-semibold"
                  >
                    Control Panel
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
        {view === 'features' && <Features />}
        {view === 'pricing' && <Pricing openAuth={openAuth} />}
        {view === 'reviews' && <Reviews openAuth={openAuth} />}
        {view === 'faq' && <FAQ />}
        {view === 'support' && <Support />}
      </main>
      <Footer />
    </motion.div>
  );
}
