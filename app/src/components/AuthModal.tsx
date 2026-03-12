import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Lock,
  User,
  Chrome,
  Eye,
  EyeOff,
  ArrowRight,
  Gamepad2,
  Loader2,
} from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'login' | 'register';
}

export default function AuthModal({ open, onOpenChange, mode }: AuthModalProps) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    agreeTerms: false,
  });
  const { login, register, openSteamLogin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const consumePostAuthRedirect = () => {
    const redirect = sessionStorage.getItem('post_auth_redirect') || '/dashboard';
    sessionStorage.removeItem('post_auth_redirect');
    return redirect;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let success = false;
    
    if (currentMode === 'login') {
      success = await login(formData.email, formData.password);
    } else {
      if (!formData.agreeTerms) {
        setIsLoading(false);
        return;
      }
      success = await register(formData.username, formData.email, formData.password);
    }

    if (success) {
      onOpenChange(false);
      navigate(consumePostAuthRedirect());
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    onOpenChange(false);
    openSteamLogin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          
          <div className="p-6 relative">
            <DialogHeader className="text-center pb-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                <Gamepad2 className="w-7 h-7 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                {currentMode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {currentMode === 'login' ? t('auth.signInToContinue') : t('auth.startJourney')}
              </DialogDescription>
              <p className="text-slate-400 text-sm mt-1">
                {currentMode === 'login' ? t('auth.signInToContinue') : t('auth.startJourney')}
              </p>
            </DialogHeader>

            <Button
              variant="outline"
              className="w-full mb-4 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Chrome className="w-4 h-4 mr-2" />
              {t('auth.continueWithGoogle')}
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-900 text-slate-500">{t('auth.orContinueWithEmail')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {currentMode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Label htmlFor="username" className="text-slate-300">
                      {t('auth.username')}
                    </Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="username"
                        placeholder={t('auth.enterUsername')}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label htmlFor="email" className="text-slate-300">
                  {t('auth.email')}
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-300">
                  {t('auth.password')}
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.enterPassword')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {currentMode === 'register' && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked as boolean })}
                    className="mt-1 border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                  />
                  <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed">
                    {t('auth.agreeTerms')}{' '}
                    <a href="/terms" className="text-violet-400 hover:text-violet-300">
                      {t('auth.termsOfService')}
                    </a>{' '}
                    {t('auth.and')}{' '}
                    <a href="/privacy" className="text-violet-400 hover:text-violet-300">
                      {t('auth.privacyPolicy')}
                    </a>
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || (currentMode === 'register' && !formData.agreeTerms)}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {currentMode === 'login' ? t('auth.signIn') : t('auth.createAccountBtn')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                {currentMode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                <button
                  onClick={() => setCurrentMode(currentMode === 'login' ? 'register' : 'login')}
                  className="ml-1 text-violet-400 hover:text-violet-300 font-medium"
                >
                  {currentMode === 'login' ? t('auth.signUp') : t('auth.signIn')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
