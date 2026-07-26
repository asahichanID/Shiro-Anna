export type BadgeTier = 'Rare' | 'Epic' | 'Legend';
export type BadgeKind = 'plain' | 'shine' | 'rainbowPulse' | 'flame';
export type BadgeId =
  | 'blue_plain'
  | 'red_plain'
  | 'yellow_plain'
  | 'blue_shine'
  | 'red_shine'
  | 'yellow_shine'
  | 'rainbow_pulse'
  | 'flame';

export type PremiumPlanId = 'premium_1d' | 'premium_7d' | 'premium_30d';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  displayName: string;
  tier: BadgeTier;
  kind: BadgeKind;
  price: number;
  shortLabel: string;
  colors: string[];
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
  animationClass?: string;
  outerClass?: string;
}

export interface OwnedBadge {
  id: BadgeId;
  customName: string;
  purchasedAt: number;
  equippedAt?: number;
}

export interface PremiumPlan {
  id: PremiumPlanId;
  name: string;
  durationLabel: string;
  durationMs: number;
  price: number;
  shortLabel: string;
  colors: string[];
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
  benefits: string[];
  animationClass?: string;
}

export const BADGE_TEXT_LIMIT = 7;

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'blue_plain',
    name: 'Blue',
    displayName: 'Blue',
    tier: 'Rare',
    kind: 'plain',
    price: 5000,
    shortLabel: 'Blue',
    colors: ['#2563eb', '#1d4ed8'],
    bgClass: 'bg-gradient-to-r from-blue-600 to-blue-800',
    textClass: 'text-white',
    borderClass: 'border-blue-300/40',
    glowClass: 'shadow-[0_0_20px_rgba(59,130,246,0.18)]',
    description: 'Biru polos yang bersih, simpel, dan elegan.',
  },
  {
    id: 'red_plain',
    name: 'Red',
    displayName: 'Red',
    tier: 'Rare',
    kind: 'plain',
    price: 5000,
    shortLabel: 'Red',
    colors: ['#dc2626', '#991b1b'],
    bgClass: 'bg-gradient-to-r from-red-600 to-red-800',
    textClass: 'text-white',
    borderClass: 'border-red-300/40',
    glowClass: 'shadow-[0_0_20px_rgba(248,113,113,0.18)]',
    description: 'Merah polos yang tegas dan rapi.',
  },
  {
    id: 'yellow_plain',
    name: 'Yellow',
    displayName: 'Yellow',
    tier: 'Rare',
    kind: 'plain',
    price: 5000,
    shortLabel: 'Yellow',
    colors: ['#eab308', '#ca8a04'],
    bgClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
    textClass: 'text-slate-950',
    borderClass: 'border-yellow-200/70',
    glowClass: 'shadow-[0_0_20px_rgba(250,204,21,0.18)]',
    description: 'Kuning polos yang hangat dan cerah.',
  },
  {
    id: 'blue_shine',
    name: 'Blue Shine',
    displayName: 'Blue Shine',
    tier: 'Epic',
    kind: 'shine',
    price: 15000,
    shortLabel: 'Blue+',
    colors: ['#1d4ed8', '#60a5fa', '#93c5fd'],
    bgClass: 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600',
    textClass: 'text-white',
    borderClass: 'border-sky-200/70',
    glowClass: 'shadow-[0_0_24px_rgba(56,189,248,0.28)]',
    animationClass: 'animate-badge-shine-smooth',
    description: 'Biru berkilau dengan kilau halus dan premium.',
  },
  {
    id: 'red_shine',
    name: 'Red Shine',
    displayName: 'Red Shine',
    tier: 'Epic',
    kind: 'shine',
    price: 15000,
    shortLabel: 'Red+',
    colors: ['#b91c1c', '#f87171', '#fecaca'],
    bgClass: 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-700',
    textClass: 'text-white',
    borderClass: 'border-rose-200/70',
    glowClass: 'shadow-[0_0_24px_rgba(251,113,133,0.26)]',
    animationClass: 'animate-badge-shine-smooth',
    description: 'Merah berkilau dengan aura lembut yang eksklusif.',
  },
  {
    id: 'yellow_shine',
    name: 'Yellow Shine',
    displayName: 'Yellow Shine',
    tier: 'Epic',
    kind: 'shine',
    price: 15000,
    shortLabel: 'Gold+',
    colors: ['#d97706', '#fbbf24', '#fde68a'],
    bgClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600',
    textClass: 'text-slate-950',
    borderClass: 'border-yellow-100/80',
    glowClass: 'shadow-[0_0_24px_rgba(250,204,21,0.28)]',
    animationClass: 'animate-badge-shine-smooth',
    description: 'Kuning metalik yang mewah dan lembut.',
  },
  {
    id: 'rainbow_pulse',
    name: 'Rainbow Pulse',
    displayName: 'Rainbow Pulse',
    tier: 'Legend',
    kind: 'rainbowPulse',
    price: 35000,
    shortLabel: 'Rainbow',
    colors: ['#ef4444', '#3b82f6', '#fbbf24'],
    bgClass: 'bg-gradient-to-r from-red-500 via-blue-500 via-yellow-400 to-red-500',
    textClass: 'text-white',
    borderClass: 'border-white/70',
    glowClass: 'shadow-[0_0_30px_rgba(236,72,153,0.36)]',
    animationClass: 'animate-rainbow-pulse-premium',
    description: 'Rainbow pulse halus, lembut, dan sangat premium.',
  },
  {
    id: 'flame',
    name: 'Flame',
    displayName: 'Flame',
    tier: 'Legend',
    kind: 'flame',
    price: 35000,
    shortLabel: 'Flame',
    colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
    bgClass: 'bg-gradient-to-r from-red-500 via-orange-500 via-yellow-400 via-emerald-400 to-blue-500',
    textClass: 'text-white',
    borderClass: 'border-orange-200/70',
    glowClass: 'shadow-[0_0_30px_rgba(249,115,22,0.34)]',
    animationClass: 'animate-flame-flow',
    description: 'Flame lima warna yang cepat dan dinamis.',
  },
];

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'premium_1d',
    name: 'Premium 1 Hari',
    durationLabel: '1 Hari',
    durationMs: 24 * 60 * 60 * 1000,
    price: 10000,
    shortLabel: '1D',
    colors: ['#14b8a6', '#0f766e', '#99f6e4'],
    bgClass: 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-600',
    textClass: 'text-white',
    borderClass: 'border-cyan-200/60',
    glowClass: 'shadow-[0_0_24px_rgba(34,211,238,0.22)]',
    description: 'Akses premium singkat dengan tampilan yang lebih mewah.',
    benefits: ['Label premium di profile', 'Akses tampilan eksklusif', 'Prioritas badge preview'],
  },
  {
    id: 'premium_7d',
    name: 'Premium 7 Hari',
    durationLabel: '7 Hari',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    price: 45000,
    shortLabel: '7D',
    colors: ['#8b5cf6', '#6366f1', '#22d3ee'],
    bgClass: 'bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500',
    textClass: 'text-white',
    borderClass: 'border-violet-200/70',
    glowClass: 'shadow-[0_0_28px_rgba(139,92,246,0.24)]',
    description: 'Lebih lama, lebih elegan, cocok buat tampilan rutin.',
    benefits: ['Premium aktif 7 hari', 'Halo halus pada profile', 'Badge preview lebih terang'],
  },
  {
    id: 'premium_30d',
    name: 'Premium 30 Hari',
    durationLabel: '30 Hari',
    durationMs: 30 * 24 * 60 * 60 * 1000,
    price: 120000,
    shortLabel: '30D',
    colors: ['#f59e0b', '#ec4899', '#8b5cf6'],
    bgClass: 'bg-gradient-to-r from-amber-500 via-fuchsia-500 to-violet-500',
    textClass: 'text-white',
    borderClass: 'border-amber-200/70',
    glowClass: 'shadow-[0_0_34px_rgba(245,158,11,0.26)]',
    description: 'Paket premium paling lengkap dan paling tenang.',
    benefits: ['Premium aktif 30 hari', 'Aura profile eksklusif', 'Prioritas tampilan shop'],
    animationClass: 'animate-rainbow-pulse-premium',
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGE_CATALOG.map((badge) => [badge.id, badge])) as Record<BadgeId, BadgeDefinition>;
export const PREMIUM_BY_ID = Object.fromEntries(PREMIUM_PLANS.map((plan) => [plan.id, plan])) as Record<PremiumPlanId, PremiumPlan>;

export function getBadgeDefinition(id?: string | null): BadgeDefinition | undefined {
  if (!id) return undefined;
  return (BADGE_BY_ID as Record<string, BadgeDefinition | undefined>)[id];
}

export function getPremiumDefinition(id?: string | null): PremiumPlan | undefined {
  if (!id) return undefined;
  return (PREMIUM_BY_ID as Record<string, PremiumPlan | undefined>)[id];
}

export function clampBadgeText(input: string, fallback: string): string {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, BADGE_TEXT_LIMIT);
}

export function createOwnedBadge(id: BadgeId, customName?: string, purchasedAt: number = Date.now()): OwnedBadge {
  const def = BADGE_BY_ID[id];
  return {
    id,
    customName: clampBadgeText(customName || def.displayName, def.displayName),
    purchasedAt,
  };
}

export function normalizeOwnedBadges(value: unknown): OwnedBadge[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Partial<OwnedBadge>;
      const badgeId = raw.id && BADGE_BY_ID[raw.id as BadgeId] ? (raw.id as BadgeId) : null;
      if (!badgeId) return null;
      return {
        id: badgeId,
        customName: clampBadgeText(String(raw.customName || BADGE_BY_ID[badgeId].displayName), BADGE_BY_ID[badgeId].displayName),
        purchasedAt: Number(raw.purchasedAt || Date.now()),
        equippedAt: raw.equippedAt ? Number(raw.equippedAt) : undefined,
      } as OwnedBadge;
    })
    .filter(Boolean) as OwnedBadge[];
}

export function getOwnedBadge(owned: OwnedBadge[] | undefined, badgeId?: string | null): OwnedBadge | undefined {
  if (!badgeId) return undefined;
  return owned?.find((item) => item.id === badgeId);
}

export function resolveBadgeLabel(owned: OwnedBadge | undefined, fallbackBadgeId?: string | null): string {
  const badge = owned || (fallbackBadgeId ? createOwnedBadge(fallbackBadgeId as BadgeId) : undefined);
  if (!badge) return '';
  return clampBadgeText(badge.customName, BADGE_BY_ID[badge.id].displayName);
}

export function premiumUntilToText(until?: number | null): string {
  if (!until || until <= Date.now()) return 'Tidak aktif';
  return new Date(until).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
