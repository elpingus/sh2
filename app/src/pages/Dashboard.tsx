import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation, Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  Share2,
  Star,
  User,
  LogOut,
  Menu,
  ChevronDown,
  Shield,
} from 'lucide-react';
import Overview from '@/components/dashboard/Overview';
import Games from '@/components/dashboard/Games';
import SettingsPanel from '@/components/dashboard/SettingsPanel';
import SupportPanel from '@/components/dashboard/SupportPanel';
import Referrals from '@/components/dashboard/Referrals';
import ReviewsPanel from '@/components/dashboard/ReviewsPanel';
import { APP_LANGUAGES, resolveLanguageCode } from '@/lib/languages';
import { planDisplayName } from '@/lib/planNames';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'overview', path: '' },
  { icon: HelpCircle, label: 'support', path: 'support' },
  { icon: Share2, label: 'referrals', path: 'referrals' },
  { icon: Star, label: 'reviews', path: 'reviews' },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [boostSettingsOpen, setBoostSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = APP_LANGUAGES.find((l) => l.code === resolveLanguageCode(i18n.language)) || APP_LANGUAGES[0];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const currentPath = location.pathname.split('/').pop() || '';

  useEffect(() => {
    if (currentPath === 'settings') {
      setAccountSettingsOpen(true);
    }
  }, [currentPath]);

  if (isLoading || !user) return null;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-slate-500/20 text-slate-400';
      case 'premium': return 'bg-violet-500/20 text-violet-400';
      case 'lifetime': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/brand-icon.svg"
              alt="Steamhoursnet"
              className="w-9 h-9 rounded-xl shadow-lg shadow-black/30 ring-1 ring-white/10"
            />
            <span className="text-lg font-bold text-white">Steamhoursnet</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            {t('nav.support')}
          </div>
          {sidebarItems.slice(0, 3).map((item) => (
            <Link
              key={item.path}
              to={`/dashboard/${item.path}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                (currentPath === '' && item.path === '') || currentPath === item.path
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {t(`dashboard.${item.label}`)}
            </Link>
          ))}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">
            Panel
          </div>
          <button
            onClick={() => {
              setSidebarOpen(false);
              setAccountSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-white hover:bg-white/5"
          >
            <Settings className="w-5 h-5" />
            {t('dashboard.settings')}
          </button>
          {sidebarItems.slice(3).map((item) => (
            <Link
              key={item.path}
              to={`/dashboard/${item.path}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPath === item.path
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {t(`dashboard.${item.label}`)}
            </Link>
          ))}

          {user.isAdmin && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">
                Admin
              </div>
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Shield className="w-5 h-5" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-white/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-9 h-9 ring-2 ring-violet-500/40 ring-offset-2 ring-offset-slate-950">
                  <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 min-w-6 rounded-full border border-violet-400/40 bg-slate-950 px-1.5 py-0.5 text-center text-[10px] font-semibold text-violet-200">
                    {user.level || 1}
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${getPlanColor(user.plan)}`}>
                      {planDisplayName(user.plan)}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10">
              <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAccountSettingsOpen(true)}
                className="text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-400 hover:text-red-300 hover:bg-white/5 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('dashboard.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  >
                    <img src={currentLang.icon} alt={currentLang.label} className="mr-1 w-4 h-4 rounded-full object-cover" />
                    {currentLang.badge}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-white/10">
                  {APP_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        localStorage.setItem('i18nextLng', lang.code);
                      }}
                      className="flex items-center gap-3 cursor-pointer hover:bg-white/5"
                    >
                      <img src={lang.icon} alt={lang.label} className="w-4 h-4 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-slate-400 w-6">{lang.badge}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="relative hidden sm:block">
                <Avatar className="w-9 h-9 ring-2 ring-violet-500/40 ring-offset-2 ring-offset-slate-950">
                  <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 min-w-6 rounded-full border border-violet-400/40 bg-slate-950 px-1.5 py-0.5 text-center text-[10px] font-semibold text-violet-200">
                  {user.level || 1}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Overview onOpenBoostSettings={() => setBoostSettingsOpen(true)} />} />
            <Route path="games" element={<Games />} />
            <Route path="billing" element={<Navigate to="/dashboard" replace />} />
            <Route path="support" element={<SupportPanel />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="reviews" element={<ReviewsPanel />} />
            <Route path="settings" element={<SettingsPanel mode="account" />} />
          </Routes>
        </main>
      </div>

      <Dialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen}>
        <DialogContent className="max-w-5xl bg-slate-900 border-white/10 max-h-[92vh] overflow-y-auto">
          <DialogTitle className="sr-only">Site Account Settings</DialogTitle>
          <SettingsPanel mode="account" />
        </DialogContent>
      </Dialog>

      <Dialog open={boostSettingsOpen} onOpenChange={setBoostSettingsOpen}>
        <DialogContent className="max-w-5xl bg-slate-900 border-white/10 max-h-[92vh] overflow-y-auto">
          <DialogTitle className="sr-only">Boost Settings</DialogTitle>
          <SettingsPanel mode="boost" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
