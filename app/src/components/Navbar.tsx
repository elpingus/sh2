import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { APP_LANGUAGES, resolveLanguageCode } from '@/lib/languages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  openAuth: (mode: 'login' | 'register') => void;
  changeLanguage: (lang: string) => void;
}

export default function Navbar({ openAuth, changeLanguage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();

  const currentLang = APP_LANGUAGES.find((l) => l.code === resolveLanguageCode(i18n.language)) || APP_LANGUAGES[0];

  const navLinks = [
    { label: t('nav.pricing'), to: '/pricing' },
    { label: t('nav.reviews'), to: '/reviews' },
    { label: t('nav.faq'), to: '/faq' },
    { label: t('nav.support'), to: '/support' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    changeLanguage(langCode);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <motion.div
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/brand-icon.svg"
                alt="Steamhoursnet"
                className="w-9 h-9 rounded-xl shadow-lg shadow-black/30 ring-1 ring-white/10"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Steamhoursnet
              </span>
            </Link>
          </motion.div>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  location.pathname === link.to
                    ? 'text-white bg-white/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  <img src={currentLang.icon} alt={currentLang.label} className="w-4 h-4 rounded-full object-cover" />
                  <span className="text-xs font-semibold">{currentLang.badge}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-slate-900/95 backdrop-blur-xl border-white/10"
              >
                {APP_LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5"
                  >
                    <img src={lang.icon} alt={lang.label} className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-xs font-semibold text-slate-400 w-6">{lang.badge}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden sm:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    Logout {user?.username ? `(${user.username})` : ''}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAuth('login')}
                    className="text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    {t('nav.login')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openAuth('register')}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
                  >
                    {t('nav.signup')}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-slate-300 hover:text-white hover:bg-white/5"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex gap-2 px-4 flex-wrap">
                  {APP_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        handleLanguageChange(lang.code);
                        setMobileOpen(false);
                      }}
                      className={`h-10 px-3 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        currentLang.code === lang.code ? 'bg-violet-500/20' : 'bg-white/5'
                      }`}
                    >
                      <img src={lang.icon} alt={lang.label} className="w-4 h-4 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0">
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth('login');
                      }}
                    >
                      {t('nav.login')}
                    </Button>
                    <Button
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuth('register');
                      }}
                    >
                      {t('nav.signup')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
