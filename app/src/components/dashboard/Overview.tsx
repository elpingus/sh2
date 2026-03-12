import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Gamepad2,
  Plus,
  Clock,
  TrendingUp,
  Timer,
  AlertCircle,
  CheckCircle2,
  Unplug,
  Trash2,
  Search,
  X,
  KeyRound,
} from 'lucide-react';
import SteamConnectModal from '@/components/SteamConnectModal';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { planDisplayName } from '@/lib/planNames';

interface SteamGame {
  id: string;
  appId: string;
  name: string;
  icon?: string;
  isFree?: boolean;
}

interface BoostStatus {
  state: 'starting' | 'started' | 'paused' | 'stopped' | 'error' | 'recovering' | 'guard_required' | 'relogin_required';
  uptimeSeconds: number;
  totalBoostedMinutes: number;
  currentGames: SteamGame[];
  runningAccounts?: number;
  startedAccountIds?: string[];
  accountStats?: Record<string, {
    uptimeSeconds: number;
    boostedMinutes: number;
    isPlaying: boolean;
  }>;
  error: string | null;
  updatedAt: string;
}

interface SteamAccount {
  id: string;
  username: string;
  avatarUrl?: string;
  connected?: boolean;
  state?: {
    connected: boolean;
    loggingIn: boolean;
    guardRequired: boolean;
    guardDomain: string | null;
    lastCodeWrong: boolean;
    error: string | null;
  };
}

interface OverviewProps {
  onOpenBoostSettings?: () => void;
}

const recoveryStateLabels = {
  en: {
    recovering: 'Recovering',
    guard_required: 'Guard Required',
    relogin_required: 'Relogin Required',
  },
  tr: {
    recovering: 'Toparlaniyor',
    guard_required: 'Guard Gerekli',
    relogin_required: 'Yeniden Giris Gerekli',
  },
  de: {
    recovering: 'Wird wiederhergestellt',
    guard_required: 'Guard erforderlich',
    relogin_required: 'Neu anmelden',
  },
  es: {
    recovering: 'Recuperando',
    guard_required: 'Guard requerido',
    relogin_required: 'Se requiere nuevo inicio',
  },
  pt: {
    recovering: 'Recuperando',
    guard_required: 'Guard necessario',
    relogin_required: 'Relogin necessario',
  },
  pl: {
    recovering: 'Przywracanie',
    guard_required: 'Wymagany Guard',
    relogin_required: 'Wymagane ponowne logowanie',
  },
  ru: {
    recovering: 'Reconnecting',
    guard_required: 'Guard Required',
    relogin_required: 'Relogin Required',
  },
} as const;

const overviewCopy = {
  en: {
    timeLeftUnit: 'hours',
    minutesUnit: 'min',
    statusStarting: 'Starting',
    statusStarted: 'Started',
    statusPaused: 'Paused',
    statusStopped: 'Stopped',
    statusError: 'Error',
    stateConnected: 'Connected',
    stateDisconnected: 'Disconnected',
    stateGuard: 'Guard Required',
    stateStarting: 'Starting',
    stateError: 'Error',
    addAccount: 'Add Account',
    startAll: 'Start All',
    noAccounts: 'No Steam accounts added. Use Add Account.',
    connectedAccounts: 'Connected Accounts',
    connectedAccountsValue: '{{count}} running',
    liveStatus: 'Live Status',
    selectedGames: 'Selected Games',
    guardTitle: 'Steam Guard Required',
    guardPrompt: 'Enter guard code {{domain}}',
    guardPlaceholder: '2FA / email code',
    guardVerify: 'Verify Guard Code',
    gamesFor: 'Games for {{account}}',
    gamesForFallback: 'Account',
    searchGames: 'Search all Steam games...',
    freeGamesHint: 'Free games can be added from the full Steam catalog even if they are not currently in the account library.',
    selectedForAccount: 'Selected for this account ({{count}} / {{max}})',
    noGamesSelected: 'No games selected',
    typeToSearch: 'Type to search the Steam catalog',
    searching: 'Searching...',
    noGamesFound: 'No games found',
    added: 'Added',
    actionConnect: 'Connect',
    actionRelogin: 'Relogin',
    actionStop: 'Stop',
    actionStart: 'Start',
    tableState: 'State',
  },
  tr: {
    timeLeftUnit: 'saat',
    minutesUnit: 'dk',
    statusStarting: 'Baslatiliyor',
    statusStarted: 'Basladi',
    statusPaused: 'Duraklatildi',
    statusStopped: 'Durduruldu',
    statusError: 'Hata',
    stateConnected: 'Baglandi',
    stateDisconnected: 'Bagli degil',
    stateGuard: 'Guard gerekli',
    stateStarting: 'Baslatiliyor',
    stateError: 'Hata',
    addAccount: 'Hesap Ekle',
    startAll: 'Tumunu Baslat',
    noAccounts: 'Steam hesabi eklenmedi. Hesap Ekle kullan.',
    connectedAccounts: 'Bagli Hesaplar',
    connectedAccountsValue: '{{count}} calisiyor',
    liveStatus: 'Canli Durum',
    selectedGames: 'Secili Oyunlar',
    guardTitle: 'Steam Guard Gerekli',
    guardPrompt: 'Guard kodunu gir {{domain}}',
    guardPlaceholder: '2FA / e-posta kodu',
    guardVerify: 'Guard Kodunu Dogrula',
    gamesFor: '{{account}} icin oyunlar',
    gamesForFallback: 'Hesap',
    searchGames: 'Tum Steam oyunlarinda ara...',
    freeGamesHint: 'Ucretsiz oyunlar, hesap kutuphanesinde olmasa bile tam Steam katalogundan eklenebilir.',
    selectedForAccount: 'Bu hesap icin secilenler ({{count}} / {{max}})',
    noGamesSelected: 'Oyun secilmedi',
    typeToSearch: 'Steam katalogunda aramak icin yaz',
    searching: 'Araniyor...',
    noGamesFound: 'Oyun bulunamadi',
    added: 'Eklendi',
    actionConnect: 'Baglan',
    actionRelogin: 'Yeniden Giris',
    actionStop: 'Durdur',
    actionStart: 'Baslat',
    tableState: 'Durum',
  },
  de: {
    timeLeftUnit: 'Std.',
    minutesUnit: 'Min.',
    statusStarting: 'Startet',
    statusStarted: 'Gestartet',
    statusPaused: 'Pausiert',
    statusStopped: 'Gestoppt',
    statusError: 'Fehler',
    stateConnected: 'Verbunden',
    stateDisconnected: 'Getrennt',
    stateGuard: 'Guard erforderlich',
    stateStarting: 'Startet',
    stateError: 'Fehler',
    addAccount: 'Konto hinzufugen',
    startAll: 'Alle starten',
    noAccounts: 'Keine Steam-Konten hinzugefugt. Nutze Konto hinzufugen.',
    connectedAccounts: 'Verbundene Konten',
    connectedAccountsValue: '{{count}} aktiv',
    liveStatus: 'Live-Status',
    selectedGames: 'Ausgewahlte Spiele',
    guardTitle: 'Steam Guard erforderlich',
    guardPrompt: 'Guard-Code eingeben {{domain}}',
    guardPlaceholder: '2FA- / E-Mail-Code',
    guardVerify: 'Guard-Code bestatigen',
    gamesFor: 'Spiele fur {{account}}',
    gamesForFallback: 'Konto',
    searchGames: 'Alle Steam-Spiele durchsuchen...',
    freeGamesHint: 'Kostenlose Spiele konnen aus dem gesamten Steam-Katalog hinzugefugt werden, auch wenn sie nicht in der Bibliothek des Kontos sind.',
    selectedForAccount: 'Fur dieses Konto ausgewahlt ({{count}} / {{max}})',
    noGamesSelected: 'Keine Spiele ausgewahlt',
    typeToSearch: 'Tippe, um den Steam-Katalog zu durchsuchen',
    searching: 'Suche lauft...',
    noGamesFound: 'Keine Spiele gefunden',
    added: 'Hinzugefugt',
    actionConnect: 'Verbinden',
    actionRelogin: 'Neu anmelden',
    actionStop: 'Stoppen',
    actionStart: 'Starten',
    tableState: 'Status',
  },
  es: {
    timeLeftUnit: 'horas',
    minutesUnit: 'min',
    statusStarting: 'Iniciando',
    statusStarted: 'Iniciado',
    statusPaused: 'Pausado',
    statusStopped: 'Detenido',
    statusError: 'Error',
    stateConnected: 'Conectado',
    stateDisconnected: 'Desconectado',
    stateGuard: 'Guard requerido',
    stateStarting: 'Iniciando',
    stateError: 'Error',
    addAccount: 'Agregar cuenta',
    startAll: 'Iniciar todo',
    noAccounts: 'No hay cuentas de Steam agregadas. Usa Agregar cuenta.',
    connectedAccounts: 'Cuentas conectadas',
    connectedAccountsValue: '{{count}} en ejecucion',
    liveStatus: 'Estado en vivo',
    selectedGames: 'Juegos seleccionados',
    guardTitle: 'Steam Guard requerido',
    guardPrompt: 'Ingresa el codigo guard {{domain}}',
    guardPlaceholder: 'Codigo 2FA / correo',
    guardVerify: 'Verificar codigo guard',
    gamesFor: 'Juegos para {{account}}',
    gamesForFallback: 'Cuenta',
    searchGames: 'Buscar en todos los juegos de Steam...',
    freeGamesHint: 'Los juegos gratis se pueden agregar desde todo el catalogo de Steam aunque no esten en la biblioteca de la cuenta.',
    selectedForAccount: 'Seleccionados para esta cuenta ({{count}} / {{max}})',
    noGamesSelected: 'No hay juegos seleccionados',
    typeToSearch: 'Escribe para buscar en el catalogo de Steam',
    searching: 'Buscando...',
    noGamesFound: 'No se encontraron juegos',
    added: 'Agregado',
    actionConnect: 'Conectar',
    actionRelogin: 'Reconectar',
    actionStop: 'Detener',
    actionStart: 'Iniciar',
    tableState: 'Estado',
  },
  pt: {
    timeLeftUnit: 'horas',
    minutesUnit: 'min',
    statusStarting: 'Iniciando',
    statusStarted: 'Iniciado',
    statusPaused: 'Pausado',
    statusStopped: 'Parado',
    statusError: 'Erro',
    stateConnected: 'Conectado',
    stateDisconnected: 'Desconectado',
    stateGuard: 'Guard necessario',
    stateStarting: 'Iniciando',
    stateError: 'Erro',
    addAccount: 'Adicionar conta',
    startAll: 'Iniciar tudo',
    noAccounts: 'Nenhuma conta Steam adicionada. Use Adicionar conta.',
    connectedAccounts: 'Contas conectadas',
    connectedAccountsValue: '{{count}} em execucao',
    liveStatus: 'Status ao vivo',
    selectedGames: 'Jogos selecionados',
    guardTitle: 'Steam Guard necessario',
    guardPrompt: 'Digite o codigo guard {{domain}}',
    guardPlaceholder: 'Codigo 2FA / e-mail',
    guardVerify: 'Verificar codigo guard',
    gamesFor: 'Jogos para {{account}}',
    gamesForFallback: 'Conta',
    searchGames: 'Pesquisar todos os jogos da Steam...',
    freeGamesHint: 'Jogos gratis podem ser adicionados do catalogo completo da Steam mesmo que nao estejam na biblioteca da conta.',
    selectedForAccount: 'Selecionados para esta conta ({{count}} / {{max}})',
    noGamesSelected: 'Nenhum jogo selecionado',
    typeToSearch: 'Digite para pesquisar no catalogo da Steam',
    searching: 'Pesquisando...',
    noGamesFound: 'Nenhum jogo encontrado',
    added: 'Adicionado',
    actionConnect: 'Conectar',
    actionRelogin: 'Relogar',
    actionStop: 'Parar',
    actionStart: 'Iniciar',
    tableState: 'Estado',
  },
  pl: {
    timeLeftUnit: 'godz.',
    minutesUnit: 'min',
    statusStarting: 'Uruchamianie',
    statusStarted: 'Uruchomiono',
    statusPaused: 'Wstrzymano',
    statusStopped: 'Zatrzymano',
    statusError: 'Blad',
    stateConnected: 'Polaczono',
    stateDisconnected: 'Rozlaczono',
    stateGuard: 'Wymagany Guard',
    stateStarting: 'Uruchamianie',
    stateError: 'Blad',
    addAccount: 'Dodaj konto',
    startAll: 'Uruchom wszystko',
    noAccounts: 'Nie dodano kont Steam. Uzyj Dodaj konto.',
    connectedAccounts: 'Polaczone konta',
    connectedAccountsValue: '{{count}} aktywne',
    liveStatus: 'Status na zywo',
    selectedGames: 'Wybrane gry',
    guardTitle: 'Wymagany Steam Guard',
    guardPrompt: 'Wpisz kod guard {{domain}}',
    guardPlaceholder: 'Kod 2FA / e-mail',
    guardVerify: 'Zweryfikuj kod guard',
    gamesFor: 'Gry dla {{account}}',
    gamesForFallback: 'Konto',
    searchGames: 'Szukaj we wszystkich grach Steam...',
    freeGamesHint: 'Darmowe gry mozna dodac z calego katalogu Steam, nawet jesli nie sa w bibliotece konta.',
    selectedForAccount: 'Wybrane dla tego konta ({{count}} / {{max}})',
    noGamesSelected: 'Nie wybrano gier',
    typeToSearch: 'Wpisz, aby przeszukac katalog Steam',
    searching: 'Wyszukiwanie...',
    noGamesFound: 'Nie znaleziono gier',
    added: 'Dodano',
    actionConnect: 'Polacz',
    actionRelogin: 'Zaloguj ponownie',
    actionStop: 'Zatrzymaj',
    actionStart: 'Uruchom',
    tableState: 'Stan',
  },
  ru: {
    timeLeftUnit: 'час.',
    minutesUnit: 'мин',
    statusStarting: 'Запуск',
    statusStarted: 'Запущено',
    statusPaused: 'Пауза',
    statusStopped: 'Остановлено',
    statusError: 'Ошибка',
    stateConnected: 'Подключено',
    stateDisconnected: 'Отключено',
    stateGuard: 'Требуется Guard',
    stateStarting: 'Запуск',
    stateError: 'Ошибка',
    addAccount: 'Добавить аккаунт',
    startAll: 'Запустить все',
    noAccounts: 'Аккаунты Steam не добавлены. Используйте Добавить аккаунт.',
    connectedAccounts: 'Подключенные аккаунты',
    connectedAccountsValue: '{{count}} активно',
    liveStatus: 'Текущий статус',
    selectedGames: 'Выбранные игры',
    guardTitle: 'Требуется Steam Guard',
    guardPrompt: 'Введите код guard {{domain}}',
    guardPlaceholder: 'Код 2FA / из почты',
    guardVerify: 'Подтвердить код guard',
    gamesFor: 'Игры для {{account}}',
    gamesForFallback: 'Аккаунт',
    searchGames: 'Поиск по всем играм Steam...',
    freeGamesHint: 'Бесплатные игры можно добавить из полного каталога Steam, даже если их нет в библиотеке аккаунта.',
    selectedForAccount: 'Выбрано для этого аккаунта ({{count}} / {{max}})',
    noGamesSelected: 'Игры не выбраны',
    typeToSearch: 'Начните ввод для поиска по каталогу Steam',
    searching: 'Поиск...',
    noGamesFound: 'Игры не найдены',
    added: 'Добавлено',
    actionConnect: 'Подключить',
    actionRelogin: 'Перелогин',
    actionStop: 'Остановить',
    actionStart: 'Запустить',
    tableState: 'Статус',
  },
} as const;

type OverviewCopy = (typeof overviewCopy)[keyof typeof overviewCopy];

const defaultStatus: BoostStatus = {
  state: 'stopped',
  uptimeSeconds: 0,
  totalBoostedMinutes: 0,
  currentGames: [],
  runningAccounts: 0,
  startedAccountIds: [],
  accountStats: {},
  error: null,
  updatedAt: new Date().toISOString(),
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function isLifetimePlan(hoursLeft: number | undefined, plan: string | undefined) {
  return plan === 'lifetime' || (Number(hoursLeft) || 0) >= Number.MAX_SAFE_INTEGER / 2;
}

function formatHourMetric(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return '0';
  if (hours >= 100) return String(Math.round(hours));
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function accountStateLabel(account: SteamAccount, copy: OverviewCopy, accountRunning = false) {
  if (accountRunning) return copy.statusStarted;
  if (account.state?.error) return copy.stateError;
  if (account.state?.guardRequired) return copy.stateGuard;
  if (account.state?.connected) return copy.stateConnected;
  if (account.state?.loggingIn) return copy.stateStarting;
  return copy.stateDisconnected;
}

function accountStateClass(account: SteamAccount, accountRunning = false) {
  if (accountRunning) return 'text-emerald-300';
  if (account.state?.error) return 'text-red-300';
  if (account.state?.guardRequired) return 'text-amber-300';
  if (account.state?.connected) return 'text-emerald-300';
  if (account.state?.loggingIn) return 'text-sky-300';
  return 'text-slate-400';
}

function getBoostStateLabel(
  state: BoostStatus['state'],
  copy: OverviewCopy,
  language: keyof typeof recoveryStateLabels = 'en'
) {
  const recoveryLabels = recoveryStateLabels[language] || recoveryStateLabels.en;
  switch (state) {
    case 'starting':
      return copy.statusStarting;
    case 'started':
      return copy.statusStarted;
    case 'paused':
      return copy.statusPaused;
    case 'recovering':
      return recoveryLabels.recovering;
    case 'guard_required':
      return recoveryLabels.guard_required;
    case 'relogin_required':
      return recoveryLabels.relogin_required;
    case 'error':
      return copy.statusError;
    case 'stopped':
    default:
      return copy.statusStopped;
  }
}

export default function Overview({ onOpenBoostSettings }: OverviewProps) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<BoostStatus>(defaultStatus);
  const [accounts, setAccounts] = useState<SteamAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [steamSetupOpen, setSteamSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountBusyId, setAccountBusyId] = useState<string | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const [guardCode, setGuardCode] = useState('');
  const [guardDomain, setGuardDomain] = useState<string | null>(null);
  const [guardAccountId, setGuardAccountId] = useState<string | null>(null);
  const [gamesModalOpen, setGamesModalOpen] = useState(false);
  const [gamesAccount, setGamesAccount] = useState<SteamAccount | null>(null);
  const [accountGames, setAccountGames] = useState<SteamGame[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SteamGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [gamesSaving, setGamesSaving] = useState(false);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const languageKey = ((i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as keyof typeof overviewCopy);
  const copy = overviewCopy[languageKey] || overviewCopy.en;

  const isRunning = status.state === 'started' || status.state === 'starting';
  const isLifetime = isLifetimePlan(user?.hoursLeft, user?.plan);

  const syncGuardModal = (nextAccounts: SteamAccount[]) => {
    if (guardOpen) return;
    const pendingGuard = nextAccounts.find((account) => account.state?.guardRequired);
    if (!pendingGuard) return;
    setGuardAccountId(pendingGuard.id);
    setGuardDomain(pendingGuard.state?.guardDomain || null);
    setGuardCode('');
    setGuardOpen(true);
  };

  const stats = useMemo(
    () => [
      {
        label: t('dashboard.table.timeLeft'),
        value: isLifetime ? 'Lifetime' : formatHourMetric(Math.max(0, user?.hoursLeft || 0)),
        unit: isLifetime ? undefined : copy.timeLeftUnit,
        icon: Timer,
        color: 'text-blue-400',
      },
      { label: t('dashboard.stats.gamesBoosting'), value: String(status.currentGames.length), icon: Gamepad2, color: 'text-violet-400' },
      {
        label: t('dashboard.stats.planHoursUsed'),
        value: formatHourMetric((status.totalBoostedMinutes || 0) / 60),
        unit: copy.timeLeftUnit,
        icon: Clock,
        color: 'text-purple-400',
      },
      {
        label: t('dashboard.stats.totalHoursBoosted'),
        value: formatHourMetric(user?.totalHoursBoosted || 0),
        unit: copy.timeLeftUnit,
        icon: TrendingUp,
        color: 'text-green-400',
      },
    ],
    [copy.timeLeftUnit, isLifetime, status, t, user?.hoursLeft, user?.totalHoursBoosted]
  );

  const loadStatus = async ({ silent = false } = {}) => {
    try {
      const payload = await apiRequest<{ status: BoostStatus }>('/boost/status');
      setStatus(payload.status || defaultStatus);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load boost status');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async ({ silent = false } = {}) => {
    try {
      const payload = await apiRequest<{ accounts: SteamAccount[] }>('/steam/accounts');
      const nextAccounts = payload.accounts || [];
      setAccounts(nextAccounts);
      syncGuardModal(nextAccounts);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load steam accounts');
      }
    }
  };

  const loadAccountGames = async (accountId: string) => {
    const payload = await apiRequest<{ games: SteamGame[] }>(`/steam/accounts/${accountId}/games`);
    setAccountGames(payload.games || []);
  };

  useEffect(() => {
    loadStatus();
    loadAccounts();
  }, []);

  useEffect(() => {
    if (steamSetupOpen) return;
    loadAccounts();
  }, [steamSetupOpen]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadStatus({ silent: true });
      void loadAccounts({ silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gamesModalOpen) return;
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const payload = await apiRequest<{ games: SteamGame[] }>(`/steam/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(payload.games || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Steam search failed');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, gamesModalOpen]);

  const startAllBoost = async () => {
    setBusy(true);
    try {
      const payload = await apiRequest<{ status: BoostStatus }>('/boost/start', { method: 'POST' });
      setStatus(payload.status);
      await refreshUser();
      await loadAccounts({ silent: true });
      if (payload.status.state === 'error' && payload.status.error) {
        toast.error(payload.status.error);
      } else if (payload.status.state === 'guard_required') {
        toast.error('Steam Guard required');
      } else {
        toast.success('Start all sent');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start boost');
    } finally {
      setBusy(false);
    }
  };

  const pauseBoost = async () => {
    setBusy(true);
    try {
      const payload = await apiRequest<{ status: BoostStatus }>('/boost/pause', { method: 'POST' });
      setStatus(payload.status);
      toast.success('Boost paused');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to pause boost');
    } finally {
      setBusy(false);
    }
  };

  const stopBoost = async () => {
    setBusy(true);
    try {
      const payload = await apiRequest<{ status: BoostStatus }>('/boost/stop', { method: 'POST' });
      setStatus(payload.status);
      toast.success('Boost stopped');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop boost');
    } finally {
      setBusy(false);
    }
  };

  const startSingleBoost = async (accountId: string) => {
    setAccountBusyId(accountId);
    try {
      const payload = await apiRequest<{ status: BoostStatus }>(`/boost/start-account/${accountId}`, { method: 'POST' });
      setStatus(payload.status);
      await refreshUser();
      await loadAccounts({ silent: true });
      if (payload.status.state === 'error' && payload.status.error) {
        toast.error(payload.status.error);
      } else if (payload.status.state === 'guard_required') {
        toast.error('Steam Guard required');
      } else {
        toast.success('Account started');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start account');
    } finally {
      setAccountBusyId(null);
    }
  };

  const stopSingleBoost = async (accountId: string) => {
    setAccountBusyId(accountId);
    try {
      const payload = await apiRequest<{ status: BoostStatus }>(`/boost/stop-account/${accountId}`, { method: 'POST' });
      setStatus(payload.status);
      toast.success('Account stopped');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop account');
    } finally {
      setAccountBusyId(null);
    }
  };

  const submitGuardCode = async () => {
    if (!guardAccountId || !guardCode.trim()) {
      toast.error('Guard code is required');
      return;
    }

    setAccountBusyId(guardAccountId);
    try {
      const guardPayload = await apiRequest<{
        result: { status: 'connected' | 'guard_required' | 'error'; message?: string; domain?: string | null };
      }>(`/steam/connect/guard/${guardAccountId}`, {
        method: 'POST',
        body: JSON.stringify({ code: guardCode.trim() }),
      });

      if (guardPayload.result.status === 'connected') {
        toast.success('Guard verified, account connected');
        setGuardOpen(false);
        setGuardCode('');
        setGuardDomain(null);
        setGuardAccountId(null);
      } else if (guardPayload.result.status === 'guard_required') {
        setGuardDomain(guardPayload.result.domain || null);
        toast.error('Wrong code, try again');
      } else {
        toast.error(guardPayload.result.message || 'Guard verification failed');
      }

      await loadAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Guard verification failed');
    } finally {
      setAccountBusyId(null);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    setAccountBusyId(accountId);
    try {
      await apiRequest(`/steam/disconnect/${accountId}`, { method: 'POST' });
      toast.success('Account disconnected');
      await loadAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disconnect failed');
    } finally {
      setAccountBusyId(null);
    }
  };

  const removeAccount = async (accountId: string) => {
    if (!window.confirm('Remove this Steam account?')) return;
    setAccountBusyId(accountId);
    try {
      await apiRequest(`/steam/accounts/${accountId}`, { method: 'DELETE' });
      toast.success('Account removed');
      await loadAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Remove failed');
    } finally {
      setAccountBusyId(null);
    }
  };

  const openGamesModal = async (account: SteamAccount) => {
    setGamesAccount(account);
    setSearchQuery('');
    setSearchResults([]);
    setGamesModalOpen(true);
    try {
      await loadAccountGames(account.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load account games');
    }
  };

  const addGameToAccount = async (game: SteamGame) => {
    if (!gamesAccount) return;
    setGamesSaving(true);
    try {
      const payload = await apiRequest<{ games: SteamGame[] }>(`/steam/accounts/${gamesAccount.id}/games`, {
        method: 'POST',
        body: JSON.stringify({
          appId: game.appId,
          name: game.name,
          icon: game.icon || '',
          isFree: Boolean(game.isFree),
        }),
      });
      setAccountGames(payload.games || []);
      toast.success('Game added to account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add game');
    } finally {
      setGamesSaving(false);
    }
  };

  const removeGameFromAccount = async (appId: string) => {
    if (!gamesAccount) return;
    setGamesSaving(true);
    try {
      const payload = await apiRequest<{ games: SteamGame[] }>(`/steam/accounts/${gamesAccount.id}/games/${appId}`, {
        method: 'DELETE',
      });
      setAccountGames(payload.games || []);
      toast.success('Game removed from account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove game');
    } finally {
      setGamesSaving(false);
    }
  };

  const badgeLabel = getBoostStateLabel(status.state, copy, languageKey);

  const badgeClass =
    status.state === 'starting' ? 'bg-amber-500/20 text-amber-400'
      : status.state === 'started' ? 'bg-green-500/20 text-green-400'
      : status.state === 'recovering' ? 'bg-sky-500/20 text-sky-300'
      : status.state === 'guard_required' ? 'bg-orange-500/20 text-orange-300'
      : status.state === 'relogin_required' ? 'bg-red-500/20 text-red-300'
      : status.state === 'error' ? 'bg-red-500/20 text-red-400'
      : status.state === 'paused' ? 'bg-blue-500/20 text-blue-400'
      : 'bg-slate-500/20 text-slate-400';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl lg:text-3xl font-bold text-white">{stat.value}</span>
              {stat.unit && <span className="text-sm text-slate-500">{stat.unit}</span>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200" onClick={() => setSteamSetupOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {copy.addAccount}
            </Button>
            <div className={`w-2 h-2 rounded-full ${status.state === 'started' ? 'bg-green-500' : status.state === 'starting' ? 'bg-amber-400' : status.state === 'recovering' ? 'bg-sky-400' : status.state === 'guard_required' ? 'bg-orange-400' : status.state === 'relogin_required' || status.state === 'error' ? 'bg-red-500' : 'bg-slate-500'}`} />
            <span className="font-semibold text-white">{badgeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={badgeClass}>{badgeLabel}</Badge>
            <Badge variant="secondary" className="bg-white/5 text-slate-400">{planDisplayName(user?.plan || 'free')}</Badge>
            <Button variant="outline" size="sm" onClick={startAllBoost} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" disabled={busy || loading}>
              <Play className="w-4 h-4 mr-1" />
              {copy.startAll}
            </Button>
            <Button variant="outline" size="sm" onClick={pauseBoost} className="border-white/10 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" disabled={busy || loading || !isRunning}>
              <Pause className="w-4 h-4 mr-1" />
              {t('dashboard.actions.pause')}
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={stopBoost} disabled={busy || loading}>
              <RotateCcw className="w-4 h-4 mr-1" />
              {t('dashboard.actions.stop')}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('dashboard.table.username')}</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{copy.tableState}</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('dashboard.table.uptime')}</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('dashboard.table.timeGained')}</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{t('dashboard.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>{copy.noAccounts}</td>
                </tr>
              )}
              {accounts.map((account) => {
                const accountRunning = (status.startedAccountIds || []).includes(account.id);
                const accountStats = status.accountStats?.[account.id];
                const accountUptime = accountStats?.uptimeSeconds || 0;
                const accountBoostedHours = (accountStats?.boostedMinutes || 0) / 60;
                return (
                  <tr key={account.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                          {account.avatarUrl ? (
                            <img src={account.avatarUrl} alt={account.username} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg">?</span>
                          )}
                        </div>
                        <span className="text-slate-200 font-medium">{account.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={`text-sm font-medium ${accountStateClass(account, accountRunning)}`}>{accountStateLabel(account, copy, accountRunning)}</span></td>
                    <td className="px-4 py-4"><span className="text-slate-400">{formatDuration(accountUptime)}</span></td>
                    <td className="px-4 py-4"><span className="text-slate-400">{formatHourMetric(accountBoostedHours)} {copy.timeLeftUnit}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`border-white/10 ${accountRunning ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
                          onClick={() => (accountRunning ? stopSingleBoost(account.id) : startSingleBoost(account.id))}
                          disabled={accountBusyId === account.id}
                        >
                          {accountRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                          {accountRunning ? copy.actionStop : copy.actionStart}
                        </Button>
                        <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200" onClick={() => disconnectAccount(account.id)} disabled={accountBusyId === account.id || !account.state?.connected}>
                          <Unplug className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200" onClick={() => openGamesModal(account)}>
                          <Gamepad2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200" onClick={() => {
                          if (onOpenBoostSettings) {
                            onOpenBoostSettings();
                            return;
                          }
                          navigate('/dashboard/settings');
                        }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20" onClick={() => removeAccount(account.id)} disabled={accountBusyId === account.id}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {status.state === 'error' && status.error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/10 text-red-200 text-sm">{status.error}</div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center"><AlertCircle className="w-6 h-6 text-violet-400" /></div>
          <div>
            <p className="text-white font-medium">{copy.connectedAccounts}</p>
            <p className="text-sm text-slate-400">{copy.connectedAccountsValue.replace('{{count}}', String(status.runningAccounts || 0))}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-green-400" /></div>
          <div>
            <p className="text-white font-medium">{copy.liveStatus}</p>
            <p className="text-sm text-slate-400">{badgeLabel}</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><Gamepad2 className="w-6 h-6 text-blue-400" /></div>
          <div>
            <p className="text-white font-medium">{copy.selectedGames}</p>
            <p className="text-sm text-slate-400">{status.currentGames.length} / {user?.maxGames || 1}</p>
          </div>
        </div>
      </motion.div>

      <SteamConnectModal
        open={steamSetupOpen}
        onOpenChange={setSteamSetupOpen}
        onAccountAdded={async () => {
          await loadAccounts();
          await loadStatus();
        }}
        onGuardRequired={(accountId, domain) => {
          setGuardAccountId(accountId);
          setGuardDomain(domain || null);
          setGuardCode('');
          setGuardOpen(true);
        }}
      />

      <Dialog open={guardOpen} onOpenChange={setGuardOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{copy.guardTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-300 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-violet-400" />
              {copy.guardPrompt.replace('{{domain}}', guardDomain ? `(${guardDomain})` : '')}
            </div>
            <Input
              value={guardCode}
              onChange={(e) => setGuardCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              placeholder={copy.guardPlaceholder}
              className="bg-white/5 border-white/10 text-white uppercase"
            />
            <Button onClick={submitGuardCode} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white" disabled={!guardAccountId || accountBusyId === guardAccountId}>
              {copy.guardVerify}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gamesModalOpen} onOpenChange={setGamesModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{copy.gamesFor.replace('{{account}}', gamesAccount?.username || copy.gamesForFallback)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={copy.searchGames} className="pl-10 bg-white/5 border-white/10 text-white" />
            </div>
            <p className="text-xs text-slate-400">{copy.freeGamesHint}</p>

            <div className="rounded-xl border border-white/10 p-3 space-y-2">
              <p className="text-sm text-slate-300">{copy.selectedForAccount.replace('{{count}}', String(accountGames.length)).replace('{{max}}', String(user?.maxGames || 1))}</p>
              {accountGames.length === 0 && <p className="text-xs text-slate-500">{copy.noGamesSelected}</p>}
              {accountGames.map((game) => (
                <div key={game.appId} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {game.icon ? <img src={game.icon} alt={game.name} className="w-9 h-9 rounded-md object-cover bg-slate-800" /> : <div className="w-9 h-9 rounded-md bg-slate-700" />}
                    <span className="text-sm text-white truncate">{game.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeGameFromAccount(game.appId)} disabled={gamesSaving} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {!searchQuery.trim() ? (
                <p className="text-center text-slate-500 py-3">{copy.typeToSearch}</p>
              ) : searching ? (
                <p className="text-center text-slate-400 py-3">{copy.searching}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-slate-500 py-3">{copy.noGamesFound}</p>
              ) : (
                searchResults.slice(0, 80).map((game) => {
                  const exists = accountGames.some((g) => String(g.appId) === String(game.appId));
                  return (
                    <button
                      key={game.appId}
                      type="button"
                      onClick={() => addGameToAccount(game)}
                      disabled={exists || gamesSaving}
                      className={`w-full flex items-center justify-between rounded-lg p-2 text-left ${exists ? 'bg-violet-500/20 text-violet-200 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-slate-200'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {game.icon ? <img src={game.icon} alt={game.name} className="w-9 h-9 rounded-md object-cover bg-slate-800" /> : <div className="w-9 h-9 rounded-md bg-slate-700" />}
                        <div className="min-w-0">
                          <p className="text-sm truncate">{game.name}</p>
                          <p className="text-xs text-slate-400">App ID: {game.appId}</p>
                        </div>
                      </div>
                      {exists ? <span className="text-xs">{copy.added}</span> : <Plus className="w-4 h-4" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
