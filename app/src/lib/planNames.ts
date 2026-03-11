import type { User } from '@/contexts/AuthContext';

export const PLAN_DISPLAY_NAMES: Record<User['plan'], string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  premium: 'Premium',
  ultimate: 'Super',
  lifetime: 'Lifetime',
};

export function planDisplayName(plan: User['plan'] | string): string {
  return PLAN_DISPLAY_NAMES[plan as User['plan']] || String(plan);
}
