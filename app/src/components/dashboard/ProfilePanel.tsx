import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { planDisplayName } from '@/lib/planNames';

const XP_PER_LEVEL = 100;

export default function ProfilePanel() {
  const { user } = useAuth();

  if (!user) return null;

  const xp = Number(user.xp) || 0;
  const level = Number(user.level) || 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  const progress = Math.max(0, Math.min(100, (currentLevelXp / XP_PER_LEVEL) * 100));
  const nextLevel = level + 1;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative w-fit">
            <Avatar className="h-24 w-24 ring-2 ring-violet-500/50 ring-offset-4 ring-offset-slate-950">
              <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 min-w-8 rounded-full border border-violet-400/40 bg-slate-950 px-2 py-1 text-center text-sm font-semibold text-violet-200">
              {level}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <Badge className="bg-violet-500/15 text-violet-200 border border-violet-500/25">
                {planDisplayName(user.plan)}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-400">{user.email}</p>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">XP</span>
                <span className="text-white">{xp}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{currentLevelXp} / {XP_PER_LEVEL}</span>
                <span>{nextLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Level</p>
          <p className="mt-3 text-3xl font-bold text-white">{level}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total XP</p>
          <p className="mt-3 text-3xl font-bold text-white">{xp}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Hours Boosted</p>
          <p className="mt-3 text-3xl font-bold text-white">{Math.round((Number(user.totalHoursBoosted) || 0) * 10) / 10}</p>
        </div>
      </div>
    </div>
  );
}
