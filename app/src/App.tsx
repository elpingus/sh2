import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';
import { useTranslation } from 'react-i18next';
import './i18n';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import AdminPanel from '@/pages/AdminPanel';
import LegalPage from '@/pages/LegalPage';
import AuthModal from '@/components/AuthModal';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AppContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Set initial language from localStorage or browser
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && ['en', 'tr', 'de', 'es', 'pt', 'pl', 'ru'].includes(savedLang)) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const referral = url.searchParams.get('r');
    if (referral) {
      localStorage.setItem('steamboost_referral_code', referral.toUpperCase());
    }
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
      return;
    }

    setAuthMode(mode);
    setAuthOpen(true);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/"
            element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="home" />}
          />
          <Route path="/features" element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="features" />} />
          <Route path="/pricing" element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="pricing" />} />
          <Route path="/reviews" element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="reviews" />} />
          <Route path="/faq" element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="faq" />} />
          <Route path="/support" element={<LandingPage openAuth={openAuth} changeLanguage={changeLanguage} view="support" />} />
          <Route path="/terms" element={<LegalPage openAuth={openAuth} changeLanguage={changeLanguage} type="terms" />} />
          <Route path="/privacy" element={<LegalPage openAuth={openAuth} changeLanguage={changeLanguage} type="privacy" />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/admin/*" element={<AdminPanel />} />
        </Routes>
      </AnimatePresence>
      <AuthModal
        key={`${authMode}-${authOpen ? 'open' : 'closed'}`}
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
      />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
