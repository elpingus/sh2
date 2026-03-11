import type { User } from '@/contexts/AuthContext';

type PlanCode = User['plan'] | string;

export function canUseCardFarmer(plan: PlanCode) {
  return !['free', 'basic'].includes(String(plan));
}

export function canUseAutoFriend(plan: PlanCode) {
  return String(plan) !== 'free';
}

export function canUseHideActivity(plan: PlanCode) {
  return String(plan) !== 'free';
}

export function canUseCustomAppearance(plan: PlanCode) {
  return String(plan) !== 'free';
}
