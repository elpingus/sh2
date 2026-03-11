import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, User, Sparkles, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { canUseAutoFriend, canUseCardFarmer, canUseCustomAppearance, canUseHideActivity } from '@/lib/planFeatures';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getDashboardCopy } from '@/lib/dashboardI18n';

interface SettingsPayload {
  appearance: 'online' | 'away' | 'invisible';
  displayMode: 'normal' | 'play_together' | 'mobile' | 'big_picture' | 'vr';
  autoRestart: boolean;
  autoStop: boolean;
  hideActivity: boolean;
  autoFriend: boolean;
  cardFarmer: boolean;
  cardFarmerAutoResume: boolean;
  customTitleEnabled: boolean;
  customTitle: string;
  awayMessageEnabled: boolean;
  awayMessage: string;
}

const defaultSettings: SettingsPayload = {
  appearance: 'online',
  displayMode: 'normal',
  autoRestart: true,
  autoStop: false,
  hideActivity: false,
  autoFriend: false,
  cardFarmer: false,
  cardFarmerAutoResume: false,
  customTitleEnabled: true,
  customTitle: 'SteamBoost',
  awayMessageEnabled: false,
  awayMessage: '',
};

interface SettingsPanelProps {
  mode?: 'account' | 'boost' | 'both';
}

export default function SettingsPanel({ mode = 'both' }: SettingsPanelProps) {
  const { i18n } = useTranslation();
  const copy = getDashboardCopy(i18n.resolvedLanguage || i18n.language).settings;
  const [settings, setSettings] = useState<SettingsPayload>(defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState<SettingsPayload>(defaultSettings);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, refreshUser, updateUser } = useAuth();

  const showAccount = mode === 'account' || mode === 'both';
  const showBoost = mode === 'boost' || mode === 'both';
  const cardFarmerAvailable = canUseCardFarmer(user?.plan || 'free');
  const autoFriendAvailable = canUseAutoFriend(user?.plan || 'free');
  const hideActivityAvailable = canUseHideActivity(user?.plan || 'free');
  const customAppearanceAvailable = canUseCustomAppearance(user?.plan || 'free');

  useEffect(() => {
    const run = async () => {
      try {
        const payload = await apiRequest<{ settings: SettingsPayload }>('/settings');
        const incoming = (payload.settings || defaultSettings) as unknown as Record<string, unknown>;
        const normalizedDisplay =
          incoming.displayMode === 'compact'
            ? 'normal'
            : incoming.displayMode;
        const normalizedSettings = {
          ...defaultSettings,
          ...(incoming as Partial<SettingsPayload>),
          displayMode: (normalizedDisplay as SettingsPayload['displayMode']) || 'normal',
          cardFarmerAutoResume: Boolean(incoming.cardFarmerAutoResume),
        };
        setSettings(normalizedSettings);
        setLastSavedSettings(normalizedSettings);
        setUsername(user?.username || '');
        setAvatar(user?.avatar || '');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.username]);

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setAvatar(result);
      toast.success('Avatar selected');
    };
    reader.readAsDataURL(file);
  };

  const saveAll = async () => {
    const previousSettings = lastSavedSettings;
    const previousUsername = user?.username || '';
    const previousAvatar = user?.avatar || '';

    if (showBoost) {
      setLastSavedSettings(settings);
    }

    setSaving(true);
    try {
      if (showBoost) {
        await apiRequest('/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
      }

      if (showAccount) {
        if ((username.trim() && username.trim() !== user?.username) || avatar !== (user?.avatar || '')) {
          await updateUser({ username: username.trim(), avatar });
        }

        if (currentPassword && newPassword) {
          await apiRequest('/account/password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          setCurrentPassword('');
          setNewPassword('');
        }
      }

      await refreshUser();
      if (showBoost) {
        setLastSavedSettings(settings);
      }
      toast.success('Settings saved');
    } catch (error) {
      if (showBoost) {
        setSettings(previousSettings);
        setLastSavedSettings(previousSettings);
      }
      if (showAccount) {
        setUsername(previousUsername);
        setAvatar(previousAvatar);
      }
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(() => {
    if (mode === 'account') return copy.siteAccountSettings;
    if (mode === 'boost') return copy.boostSettings;
    return copy.settings;
  }, [copy, mode]);

  if (loading) {
    return <p className="text-slate-400">{copy.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-slate-400">
            {mode === 'account' ? copy.accountPref : mode === 'boost' ? copy.boostPref : copy.bothPref}
          </p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          {saving ? copy.saving : copy.save}
        </Button>
      </motion.div>

      <div className={`${showAccount && showBoost ? 'grid lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
        {showAccount && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-xl p-6 space-y-5 ${showBoost ? 'lg:col-span-1' : ''}`}>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{copy.siteAccount}</h3>
              <p className="text-sm text-slate-400">{copy.siteAccountDesc}</p>
            </div>

            <div>
              <Label className="text-white mb-2 block">{copy.avatar}</Label>
              <div className="flex items-center gap-4">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                    <Upload className="w-4 h-4 mr-2" />{copy.chooseFile}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">{copy.imageHint}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">{copy.username}</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>

            <div>
              <Label className="text-white mb-2 block">{copy.email}</Label>
              <Input value={user?.email || ''} disabled className="bg-white/5 border-white/10 text-slate-400" />
            </div>

            <div>
              <Label className="text-white mb-2 block">{copy.currentPassword}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>

            <div>
              <Label className="text-white mb-2 block">{copy.newPassword}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
          </motion.div>
        )}

        {showBoost && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-xl p-6 space-y-4 ${showAccount ? 'lg:col-span-2' : ''}`}>
            {user?.plan === 'free' && (
              <div className="flex items-center justify-between p-4 glass rounded-xl border border-violet-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <div>
                    <p className="text-white font-medium">{copy.unlockPremium}</p>
                    <p className="text-xs text-slate-400">{copy.unlockPremiumDesc}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => { window.location.href = '/pricing'; }}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {copy.viewPricing}
                </Button>
              </div>
            )}

            <div className="p-4 glass rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white">{copy.customInGameTitle}</p>
                <Switch
                  checked={user?.plan === 'free' ? true : settings.customTitleEnabled}
                  disabled={user?.plan === 'free'}
                  onCheckedChange={(checked) => setSettings((s) => ({ ...s, customTitleEnabled: checked }))}
                  className="data-[state=checked]:bg-violet-500"
                />
              </div>
              <p className="text-xs text-slate-400">{copy.customInGameTitleDesc}</p>
              <Input
                value={user?.plan === 'free' ? 'ste**hoursnet.xyz' : settings.customTitle}
                disabled={user?.plan === 'free'}
                onChange={(e) => setSettings((s) => ({ ...s, customTitle: e.target.value }))}
                className="bg-white/5 border-white/10 text-white disabled:opacity-60"
              />
              {user?.plan === 'free' && <p className="text-xs text-amber-300">{copy.freeFixedTitle}</p>}
            </div>

            <div className="p-4 glass rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white">{copy.customAwayMessage}</p>
                <Switch
                  checked={user?.plan === 'free' ? true : settings.awayMessageEnabled}
                  disabled={user?.plan === 'free'}
                  onCheckedChange={(checked) => setSettings((s) => ({ ...s, awayMessageEnabled: checked }))}
                  className="data-[state=checked]:bg-violet-500"
                />
              </div>
              <p className="text-xs text-slate-400">{copy.customAwayMessageDesc}</p>
              <Input
                value={user?.plan === 'free' ? 'get free hour boost steamhoursnet.xyz' : settings.awayMessage}
                disabled={user?.plan === 'free'}
                onChange={(e) => setSettings((s) => ({ ...s, awayMessage: e.target.value }))}
                className="bg-white/5 border-white/10 text-white disabled:opacity-60"
              />
              {user?.plan === 'free' && <p className="text-xs text-amber-300">{copy.freeFixedAway}</p>}
            </div>

            <div className="p-4 glass rounded-xl space-y-3">
              <p className="text-white">{copy.appearance}</p>
              <p className="text-xs text-slate-400">{copy.appearanceDesc}</p>
              <div className="grid grid-cols-2 gap-3">
                <Select value={settings.appearance} onValueChange={(v: 'online' | 'away' | 'invisible') => setSettings((s) => ({ ...s, appearance: v }))}>
                  <SelectTrigger disabled={!customAppearanceAvailable} className="bg-white/5 border-white/10 text-white disabled:opacity-60"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="online">{copy.online}</SelectItem>
                    <SelectItem value="away">{copy.away}</SelectItem>
                    <SelectItem value="invisible">{copy.invisible}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={settings.displayMode} onValueChange={(v: 'normal' | 'play_together' | 'mobile' | 'big_picture' | 'vr') => setSettings((s) => ({ ...s, displayMode: v }))}>
                  <SelectTrigger disabled={!customAppearanceAvailable} className="bg-white/5 border-white/10 text-white disabled:opacity-60"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="normal">{copy.normal}</SelectItem>
                    <SelectItem value="play_together">{copy.playTogether}</SelectItem>
                    <SelectItem value="mobile">{copy.mobile}</SelectItem>
                    <SelectItem value="big_picture">{copy.bigPicture}</SelectItem>
                    <SelectItem value="vr">{copy.vr}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!customAppearanceAvailable && <p className="text-xs text-amber-300">{copy.customAppearanceUnavailable}</p>}
              <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                <p className="text-slate-100 text-lg font-semibold">
                  {copy.steamUser}{' '}
                  {settings.displayMode !== 'normal' && (
                    <span className="bg-lime-400/90 text-slate-900 text-sm px-2 py-0.5 rounded">
                      {settings.displayMode === 'play_together'
                        ? copy.playTogether
                        : settings.displayMode === 'big_picture'
                        ? copy.bigPicture
                        : settings.displayMode === 'mobile'
                        ? copy.mobile
                        : copy.vr}
                    </span>
                  )}
                </p>
                <p className="text-lime-300">{copy.previewHello}</p>
              </div>
            </div>

            <div className="p-4 glass rounded-xl space-y-4">
              <div className="flex items-center justify-between"><span className="text-white">{copy.hideRecentActivity}</span><Switch checked={settings.hideActivity} disabled={!hideActivityAvailable} onCheckedChange={(checked) => setSettings((s) => ({ ...s, hideActivity: checked }))} className="data-[state=checked]:bg-violet-500" /></div>
              <div className="flex items-center justify-between"><span className="text-white">{copy.autoRestarter}</span><Switch checked={settings.autoRestart} onCheckedChange={(checked) => setSettings((s) => ({ ...s, autoRestart: checked }))} className="data-[state=checked]:bg-violet-500" /></div>
              <div className="flex items-center justify-between"><span className="text-white">{copy.autoFriend}</span><Switch checked={settings.autoFriend} disabled={!autoFriendAvailable} onCheckedChange={(checked) => setSettings((s) => ({ ...s, autoFriend: checked }))} className="data-[state=checked]:bg-violet-500" /></div>
              <div className="flex items-center justify-between"><span className="text-white">{copy.autoStop}</span><Switch checked={settings.autoStop} onCheckedChange={(checked) => setSettings((s) => ({ ...s, autoStop: checked }))} className="data-[state=checked]:bg-violet-500" /></div>
              {!hideActivityAvailable && <p className="text-xs text-amber-300">{copy.hideActivityUnavailable}</p>}
              {!autoFriendAvailable && <p className="text-xs text-amber-300">{copy.autoFriendUnavailable}</p>}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{copy.cardFarmer}</p>
                    <p className="text-xs text-slate-400">{copy.cardFarmerDesc}</p>
                  </div>
                  <Switch checked={settings.cardFarmer} disabled={!cardFarmerAvailable} onCheckedChange={(checked) => setSettings((s) => ({ ...s, cardFarmer: checked }))} className="data-[state=checked]:bg-violet-500" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-300">{copy.cardFarmerResume}</p>
                  <Switch checked={settings.cardFarmerAutoResume} disabled={!cardFarmerAvailable} onCheckedChange={(checked) => setSettings((s) => ({ ...s, cardFarmerAutoResume: checked }))} className="data-[state=checked]:bg-violet-500" />
                </div>
                {!cardFarmerAvailable && <p className="text-xs text-amber-300">{copy.cardFarmerUnavailable.replace('{{plan}}', user?.plan === 'basic' ? 'Basic' : 'Free')}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
