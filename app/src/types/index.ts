export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  plan: PlanType;
  hoursLeft: number;
  totalHoursBoosted: number;
  gamesCount: number;
  maxGames: number;
  joinedAt: string;
  steamConnected: boolean;
  steamUsername?: string;
}

export type PlanType = 'free' | 'basic' | 'plus' | 'premium' | 'ultimate' | 'lifetime';

export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  hoursPerGame: number;
  maxGames: number;
  features: PlanFeature[];
  popular?: boolean;
}

export interface PlanFeature {
  name: string;
  included: boolean;
  premium?: boolean;
}

export interface Game {
  id: string;
  appId: string;
  name: string;
  icon: string;
  selected?: boolean;
}

export interface BoostJob {
  id: string;
  username: string;
  status: 'running' | 'stopped' | 'paused';
  timeLeft: string;
  games: number;
  maxGames: number;
  uptime: string;
  timeGained: string;
}

export interface Review {
  id: string;
  username: string;
  avatar: string;
  rating: number;
  comment: string;
  joinedDate: string;
  postedAt: string;
  verified: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  lastUpdate: string;
}

export interface ReferralStats {
  totalReferred: number;
  paidReferred: number;
  availableRewards: number;
  referralUrl: string;
}

export interface SettingOption {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'text' | 'select';
  value: boolean | string;
  options?: { label: string; value: string }[];
  premium?: boolean;
}
