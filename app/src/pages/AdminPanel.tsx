import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth, type User } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { planDisplayName } from '@/lib/planNames';
import { toast } from 'sonner';
import { Activity, ArrowLeft, Ban, Clock3, Crown, Gift, Globe2, History, KeyRound, Laptop2, LogOut, Menu, PlusCircle, RotateCcw, Search, Settings, Shield, ShieldAlert, TrendingUp, Trash2, UserRoundCog, Users } from 'lucide-react';

type AdminStats = { totalUsers: number; activeUsers: number; paidUsers: number; totalRevenue: number; planBreakdown: Record<string, number> };
type LoginHistoryEntry = { id: string; method: string; ip: string | null; userAgent: string | null; device: string; createdAt: string };
type AuditEntry = { id?: string; action: string; targetType?: string | null; targetId?: string | null; actorId?: string | null; createdAt: string; ip?: string | null; meta?: Record<string, unknown> | null };
type UserHistoryPayload = { loginHistory: LoginHistoryEntry[]; ipAddresses: string[]; lastLoginAt: string | null; lastLoginIp: string | null; lastDevice: string | null; auditEvents: AuditEntry[] };

const ADMIN_NAV_ITEMS = [
  { icon: TrendingUp, label: 'Dashboard', path: '' },
  { icon: Users, label: 'Users', path: 'users' },
  { icon: Settings, label: 'Settings', path: 'settings' },
];

function formatDateTime(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
}

function isLifetimeUser(user?: Pick<User, 'plan' | 'hoursLeft'> | null) {
  return !!user && (user.plan === 'lifetime' || (Number(user.hoursLeft) || 0) >= Number.MAX_SAFE_INTEGER / 2);
}

function formatHoursLeft(user?: Pick<User, 'plan' | 'hoursLeft'> | null) {
  if (!user) return '-';
  if (isLifetimeUser(user)) return 'Lifetime';
  return `${Math.max(0, Math.round(Number(user.hoursLeft) || 0))}h`;
}

function planBadgeClass(plan: string) {
  switch (plan) {
    case 'lifetime': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'premium':
    case 'ultimate': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'plus':
    case 'basic': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();
  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/5">
      <div className="p-4 border-b border-white/5">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20"><Shield className="w-4 h-4 text-white" /></div>
          <div><p className="text-sm text-slate-400">Steamhoursnet</p><p className="text-lg font-bold text-white leading-tight">Admin Control</p></div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = (location.pathname === '/admin' && item.path === '') || location.pathname === `/admin/${item.path}`;
          return (
            <Link key={item.path} to={`/admin/${item.path}`} onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon className="w-5 h-5" />{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/5"><Button variant="ghost" onClick={logout} className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"><LogOut className="w-5 h-5 mr-2" />Logout</Button></div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsPayload, auditPayload] = await Promise.all([
          apiRequest<{ stats: AdminStats }>('/admin/stats'),
          apiRequest<{ logs: AuditEntry[] }>('/admin/audit-logs?limit=12'),
        ]);
        setStats(statsPayload.stats);
        setAuditLogs(auditPayload.logs || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load admin dashboard');
      }
    };
    load();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Boosting Users', value: stats?.activeUsers ?? 0, icon: Activity, color: 'text-green-400' },
    { label: 'Paid Users', value: stats?.paidUsers ?? 0, icon: Crown, color: 'text-violet-400' },
    { label: 'Revenue', value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Admin Dashboard</h1><p className="text-slate-400">Realtime overview, plan distribution and recent actions.</p></div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-400">{card.label}</span><card.icon className={`w-4 h-4 ${card.color}`} /></div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </motion.div>
        ))}
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Plan Distribution</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats?.planBreakdown || {}).map(([plan, count]) => (
              <div key={plan} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{planDisplayName(plan)}</p><p className="mt-2 text-2xl font-bold text-white">{count}</p></div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Audit Logs</h3>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {auditLogs.length === 0 && <p className="text-sm text-slate-500">No audit events found.</p>}
            {auditLogs.map((entry) => (
              <div key={`${entry.createdAt}-${entry.action}-${entry.targetId || 'none'}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white break-all">{entry.action}</p><span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(entry.createdAt)}</span></div>
                <p className="mt-1 text-xs text-slate-400 break-all">target: {entry.targetType || 'n/a'} / {entry.targetId || 'n/a'}</p>
                {entry.ip && <p className="mt-1 text-xs text-slate-500">IP: {entry.ip}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [giftPlan, setGiftPlan] = useState<User['plan']>('basic');
  const [resetPlanHours, setResetPlanHours] = useState(true);
  const [extraHours, setExtraHours] = useState('100');
  const [exactHours, setExactHours] = useState('0');
  const [slotCount, setSlotCount] = useState('1');
  const [newPassword, setNewPassword] = useState('');
  const [banReason, setBanReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<UserHistoryPayload | null>(null);
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const payload = await apiRequest<{ users: User[] }>('/admin/users');
        setUsers(payload.users || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load users');
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.username, user.email, user.lastLoginIp || '', user.lastDevice || '', planDisplayName(user.plan)].join(' ').toLowerCase().includes(q));
  }, [search, users]);

  const updateUserInState = (nextUser: User) => {
    setUsers((current) => current.map((entry) => (entry.id === nextUser.id ? nextUser : entry)));
    setSelectedUser(nextUser);
  };

  const loadHistory = async (userId: string) => {
    setHistoryLoading(true);
    try {
      const payload = await apiRequest<{ history: UserHistoryPayload }>(`/admin/users/${userId}/history`);
      setHistory(payload.history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load user history');
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openManage = async (user: User) => {
    setSelectedUser(user);
    setGiftPlan((user.plan === 'free' ? 'basic' : user.plan) as User['plan']);
    setResetPlanHours(true);
    setExtraHours('100');
    setExactHours(isLifetimeUser(user) ? '0' : String(Math.max(0, Math.round(user.hoursLeft || 0))));
    setSlotCount(String(user.steamAccountSlots || 1));
    setNewPassword('');
    setBanReason(user.bannedReason || '');
    setDialogOpen(true);
    await loadHistory(user.id);
  };

  const runUserAction = async (key: string, callback: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await callback();
    } finally {
      setBusyAction(null);
    }
  };

  const applyGiftPlan = async () => {
    if (!selectedUser) return;
    await runUserAction('gift-plan', async () => {
      const payload = await apiRequest<{ user: User }>(`/admin/users/${selectedUser.id}/gift-plan`, { method: 'POST', body: JSON.stringify({ plan: giftPlan, resetHours: resetPlanHours }) });
      updateUserInState(payload.user);
      toast.success(`Plan updated: ${planDisplayName(giftPlan)}`);
    });
  };

  const addHours = async () => {
    if (!selectedUser) return;
    await runUserAction('add-hours', async () => {
      const payload = await apiRequest<{ user: User }>(`/admin/users/${selectedUser.id}/add-hours`, { method: 'POST', body: JSON.stringify({ hours: Number(extraHours) }) });
      updateUserInState(payload.user);
      toast.success(`${extraHours} hours added`);
    });
  };

  const setHours = async () => {
    if (!selectedUser) return;
    await runUserAction('set-hours', async () => {
      const payload = await apiRequest<{ user: User }>(`/admin/users/${selectedUser.id}/set-hours`, { method: 'POST', body: JSON.stringify({ hours: Number(exactHours) }) });
      updateUserInState(payload.user);
      toast.success(`Hours updated to ${exactHours}`);
    });
  };

  const setSlots = async () => {
    if (!selectedUser) return;
    await runUserAction('set-slots', async () => {
      const payload = await apiRequest<{ user: User }>(`/admin/users/${selectedUser.id}/set-slots`, { method: 'POST', body: JSON.stringify({ slots: Number(slotCount) }) });
      updateUserInState(payload.user);
      toast.success(`Account limit updated to ${slotCount}`);
    });
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    await runUserAction('reset-password', async () => {
      await apiRequest(`/admin/users/${selectedUser.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) });
      setNewPassword('');
      toast.success('Password reset successfully');
    });
  };

  const toggleBan = async () => {
    if (!selectedUser) return;
    await runUserAction('ban-toggle', async () => {
      const endpoint = selectedUser.isBanned ? 'unban' : 'ban';
      const payload = await apiRequest<{ user: User }>(`/admin/users/${selectedUser.id}/${endpoint}`, { method: 'POST', body: JSON.stringify({ reason: banReason }) });
      updateUserInState(payload.user);
      toast.success(selectedUser.isBanned ? 'User unbanned' : 'User banned');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Users</h1><p className="text-slate-400">Manage plans, hours, slots, bans, passwords and user history.</p></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><Input placeholder="Search username, email, IP or device..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-full lg:w-80 bg-white/5 border-white/10 text-white" /></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-slate-400">User</TableHead><TableHead className="text-slate-400">Plan</TableHead><TableHead className="text-slate-400">Hours Left</TableHead><TableHead className="text-slate-400">Level</TableHead><TableHead className="text-slate-400">Slots</TableHead><TableHead className="text-slate-400">Last Login</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-white/5">
                <TableCell><div><p className="font-medium text-white">{user.username}</p><p className="text-sm text-slate-500">{user.email}</p>{user.lastLoginIp && <p className="text-xs text-slate-600 mt-1">IP: {user.lastLoginIp}</p>}</div></TableCell>
                <TableCell><Badge className={`${planBadgeClass(user.plan)} uppercase`}>{planDisplayName(user.plan)}</Badge></TableCell>
                <TableCell className="text-slate-200">{formatHoursLeft(user)}</TableCell>
                <TableCell><div className="text-white font-semibold">LVL {user.level || 1}</div><p className="text-xs text-slate-500">XP {user.xp || 0}</p></TableCell>
                <TableCell className="text-slate-300">{user.steamAccountSlots || 1}</TableCell>
                <TableCell><div className="text-slate-300 text-sm">{formatDateTime(user.lastLoginAt)}</div><p className="text-xs text-slate-500 truncate max-w-[220px]">{user.lastDevice || 'Unknown device'}</p></TableCell>
                <TableCell>{user.isBanned ? <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Banned</Badge> : <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Active</Badge>}</TableCell>
                <TableCell><Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => openManage(user)}><UserRoundCog className="w-4 h-4 mr-2" />Manage</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950 text-white">
          <DialogHeader><DialogTitle>Manage {selectedUser?.username}</DialogTitle><DialogDescription className="text-slate-400">Detailed admin controls, login history and user device information.</DialogDescription></DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Plan</p><p className="mt-2 text-lg font-semibold text-white">{planDisplayName(selectedUser.plan)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Hours Left</p><p className="mt-2 text-lg font-semibold text-white">{formatHoursLeft(selectedUser)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Level</p><p className="mt-2 text-lg font-semibold text-white">LVL {selectedUser.level || 1}</p><p className="text-xs text-slate-500 mt-1">XP {selectedUser.xp || 0}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Account Limit</p><p className="mt-2 text-lg font-semibold text-white">{selectedUser.steamAccountSlots || 1}</p></div>
              </div>
              <div className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><Gift className="w-4 h-4 text-violet-300" /> Change Plan</div><select value={giftPlan} onChange={(e) => setGiftPlan(e.target.value as User['plan'])} className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"><option value="basic">Basic</option><option value="plus">Plus</option><option value="premium">Premium</option><option value="ultimate">Super</option><option value="lifetime">Lifetime</option></select><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={resetPlanHours} onChange={(e) => setResetPlanHours(e.target.checked)} className="rounded border-white/10 bg-slate-800" />Reset user hours to selected plan default</label><Button onClick={applyGiftPlan} disabled={busyAction !== null} className="w-full bg-violet-600 hover:bg-violet-700 text-white"><Crown className="w-4 h-4 mr-2" />Apply Plan Change</Button></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><PlusCircle className="w-4 h-4 text-violet-300" /> Add Or Remove Hours</div><Input value={extraHours} onChange={(e) => setExtraHours(e.target.value)} className="bg-slate-800 border-white/10 text-white" /><p className="text-xs text-slate-500">Use negative values to subtract hours. Example: <span className="text-slate-300">-50</span></p><Button onClick={addHours} disabled={busyAction !== null} className="w-full bg-violet-600 hover:bg-violet-700 text-white"><Clock3 className="w-4 h-4 mr-2" />Apply Hour Delta</Button></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><RotateCcw className="w-4 h-4 text-violet-300" /> Set Custom Hours</div><Input value={exactHours} onChange={(e) => setExactHours(e.target.value)} className="bg-slate-800 border-white/10 text-white" /><Button onClick={setHours} disabled={busyAction !== null} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Set Hours</Button></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><Users className="w-4 h-4 text-violet-300" /> Set Account Limit</div><Input value={slotCount} onChange={(e) => setSlotCount(e.target.value)} className="bg-slate-800 border-white/10 text-white" /><Button onClick={setSlots} disabled={busyAction !== null} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Update Slots</Button></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><KeyRound className="w-4 h-4 text-violet-300" /> Reset Password</div><Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="bg-slate-800 border-white/10 text-white" /><Button onClick={resetPassword} disabled={busyAction !== null || newPassword.trim().length < 6} className="w-full bg-amber-600 hover:bg-amber-700 text-white">Reset Password</Button></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="flex items-center gap-2 text-white font-medium"><ShieldAlert className="w-4 h-4 text-violet-300" /> Ban Controls</div><Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason shown in admin history" className="bg-slate-800 border-white/10 text-white" /><Button onClick={toggleBan} disabled={busyAction !== null} className={`w-full text-white ${selectedUser.isBanned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>{selectedUser.isBanned ? <RotateCcw className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />}{selectedUser.isBanned ? 'Unban User' : 'Ban User'}</Button>{selectedUser.isBanned && selectedUser.bannedReason && <p className="text-xs text-red-300">Current reason: {selectedUser.bannedReason}</p>}</div>
              </div>
              <div className="grid xl:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-1"><div className="flex items-center gap-2 mb-3 text-white font-medium"><Globe2 className="w-4 h-4 text-violet-300" /> Known IP Addresses</div><div className="space-y-2 max-h-64 overflow-y-auto pr-1">{historyLoading && <p className="text-sm text-slate-500">Loading IP history...</p>}{!historyLoading && (history?.ipAddresses || []).length === 0 && <p className="text-sm text-slate-500">No IP addresses recorded.</p>}{(history?.ipAddresses || []).map((ip) => <div key={ip} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 break-all">{ip}</div>)}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-1"><div className="flex items-center gap-2 mb-3 text-white font-medium"><Laptop2 className="w-4 h-4 text-violet-300" /> Last Login</div><div className="space-y-2 text-sm"><div><p className="text-slate-500">Time</p><p className="text-slate-200">{formatDateTime(history?.lastLoginAt || selectedUser.lastLoginAt)}</p></div><div><p className="text-slate-500">IP</p><p className="text-slate-200 break-all">{history?.lastLoginIp || selectedUser.lastLoginIp || 'Unknown'}</p></div><div><p className="text-slate-500">Device</p><p className="text-slate-200 break-words">{history?.lastDevice || selectedUser.lastDevice || 'Unknown device'}</p></div></div></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-1"><div className="flex items-center gap-2 mb-3 text-white font-medium"><History className="w-4 h-4 text-violet-300" /> Quick Account Info</div><div className="space-y-2 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Steam linked</span><span className="text-slate-200">{selectedUser.steamConnected ? 'Yes' : 'No'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Steam accounts</span><span className="text-slate-200">{selectedUser.steamAccounts?.length || 0}</span></div><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Games</span><span className="text-slate-200">{selectedUser.gamesCount || 0} / {selectedUser.maxGames || 0}</span></div><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Created</span><span className="text-slate-200">{formatDateTime(selectedUser.createdAt)}</span></div></div></div>
              </div>
              <div className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><h3 className="text-white font-semibold mb-3">Login History</h3><div className="space-y-3 max-h-80 overflow-y-auto pr-1">{historyLoading && <p className="text-sm text-slate-500">Loading login history...</p>}{!historyLoading && (history?.loginHistory || []).length === 0 && <p className="text-sm text-slate-500">No login history found.</p>}{(history?.loginHistory || []).map((entry) => <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white uppercase">{entry.method}</p><span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span></div><p className="mt-1 text-sm text-slate-300 break-all">{entry.ip || 'Unknown IP'}</p><p className="mt-1 text-xs text-slate-500 break-words">{entry.device}</p></div>)}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><h3 className="text-white font-semibold mb-3">User Audit Events</h3><div className="space-y-3 max-h-80 overflow-y-auto pr-1">{historyLoading && <p className="text-sm text-slate-500">Loading audit events...</p>}{!historyLoading && (history?.auditEvents || []).length === 0 && <p className="text-sm text-slate-500">No audit events found.</p>}{(history?.auditEvents || []).map((entry, index) => <div key={`${entry.createdAt}-${entry.action}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white break-all">{entry.action}</p><span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(entry.createdAt)}</span></div><p className="mt-1 text-xs text-slate-400 break-all">target: {entry.targetType || 'n/a'} / {entry.targetId || 'n/a'}</p>{entry.ip && <p className="mt-1 text-xs text-slate-500 break-all">IP: {entry.ip}</p>}</div>)}</div></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminSettings() {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [coupons, setCoupons] = useState<Array<{ id: string; code: string; type: string; value: number; active: boolean; expiresAt?: string | null }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; username: string; rating: number; comment: string; plan?: string; createdAt: string }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [couponPayload, reviewPayload] = await Promise.all([
          apiRequest<{ coupons: Array<{ id: string; code: string; type: string; value: number; active: boolean; expiresAt?: string | null }> }>('/admin/coupons'),
          apiRequest<{ reviews: Array<{ id: string; username: string; rating: number; comment: string; plan?: string; createdAt: string }> }>('/admin/reviews'),
        ]);
        setCoupons(couponPayload.coupons || []);
        setReviews(reviewPayload.reviews || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load admin settings');
      }
    };
    load();
  }, []);

  const createCoupon = async () => {
    try {
      await apiRequest('/admin/coupons', { method: 'POST', body: JSON.stringify({ code, type, value: Number(value), expiresAt: expiresAt || null }) });
      toast.success('Coupon saved');
      setCode('');
      setExpiresAt('');
      const payload = await apiRequest<{ coupons: Array<{ id: string; code: string; type: string; value: number; active: boolean; expiresAt?: string | null }> }>('/admin/coupons');
      setCoupons(payload.coupons || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Coupon create failed');
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      await apiRequest(`/admin/coupons/${couponId}`, { method: 'DELETE' });
      setCoupons((current) => current.filter((coupon) => coupon.id !== couponId));
      toast.success('Coupon deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete coupon');
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await apiRequest(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      toast.success('Review deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Admin Settings</h1><p className="text-slate-400">Manage promo coupons and moderate public reviews.</p></div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-3"><h3 className="text-white font-semibold">Create Coupon</h3><div className="grid sm:grid-cols-4 gap-3"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="bg-white/5 border-white/10 text-white" /><select value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')} className="px-3 py-2 rounded-lg border border-white/10 bg-slate-800 text-white"><option value="percent">Percent</option><option value="fixed">Fixed ($)</option></select><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className="bg-white/5 border-white/10 text-white" /><Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bg-white/5 border-white/10 text-white" /></div><p className="text-xs text-slate-500">Leave expiry empty for coupons without an end date.</p><Button onClick={createCoupon} className="bg-violet-600 hover:bg-violet-700 text-white">Create Coupon</Button></div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><h3 className="text-white font-semibold mb-3">Existing Coupons</h3><div className="space-y-2">{coupons.map((coupon) => <div key={coupon.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-slate-200 min-w-0"><div className="font-semibold text-white break-all">{coupon.code}</div><div className="text-sm text-slate-400">{coupon.type} {coupon.value}</div><div className="text-xs text-slate-500">{coupon.expiresAt ? `Expires: ${formatDateTime(coupon.expiresAt)}` : 'No expiry'}</div></div><div className="flex items-center gap-2"><Badge className={coupon.active ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'}>{coupon.active ? 'ACTIVE' : 'OFF'}</Badge><Button type="button" variant="outline" size="sm" onClick={() => deleteCoupon(coupon.id)} className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4 mr-2" />Delete</Button></div></div>)}{coupons.length === 0 && <p className="text-sm text-slate-500">No coupons created yet.</p>}</div></div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><h3 className="text-white font-semibold mb-3">Reviews</h3><div className="space-y-2">{reviews.length === 0 && <p className="text-slate-500">No reviews found.</p>}{reviews.map((review) => <div key={review.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3"><div className="min-w-0"><div className="flex items-center gap-2 mb-1 flex-wrap"><span className="font-semibold text-white">{review.username}</span><Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">{review.plan || 'paid'}</Badge><span className="text-xs text-slate-500">{review.rating}/5</span></div><p className="text-sm text-slate-300 break-words">{review.comment}</p><p className="text-xs text-slate-500 mt-1">{formatDateTime(review.createdAt)}</p></div><Button type="button" variant="outline" size="sm" onClick={() => deleteReview(review.id)} className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4 mr-2" />Delete</Button></div>)}</div></div>
    </div>
  );
}

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (isLoading) return null;
  if (!isAuthenticated || !user?.isAdmin) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}><AdminSidebar onClose={() => setSidebarOpen(false)} /></aside>
      <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400"><Menu className="w-5 h-5" /></Button><Link to="/dashboard"><Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button></Link></div><div className="flex items-center gap-3"><span className="text-slate-400">Welcome, {user.username}</span><Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30">Admin</Badge></div></div></header>
        <main className="flex-1 p-4 lg:p-6"><Routes><Route path="/" element={<AdminDashboard />} /><Route path="users" element={<UsersManagement />} /><Route path="settings" element={<AdminSettings />} /></Routes></main>
      </div>
    </div>
  );
}
