export type BadgeRarity = 'Common' | 'Rare' | 'Epic' | 'Legend' | 'Mythic' | 'Absolute';

export type BadgeThemeId = 'ruby' | 'galaxy' | 'royal_gold' | 'emerald' | 'diamond' | 'absolute';

export interface BadgeThemeConfig {
  id: BadgeThemeId;
  name: string;
  rarity: BadgeRarity;
  icon: string;
  bgGradient: string;
  borderClass: string;
  textColorClass: string;
  glowColor: string;
  shadowClass: string;
  rarityBadgeClass: string;
  description: string;
  animationClass?: string;
}

export const BADGE_THEMES: Record<BadgeThemeId, BadgeThemeConfig> = {
  ruby: {
    id: 'ruby',
    name: 'Ruby Developer',
    rarity: 'Epic',
    icon: '🔥',
    bgGradient: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700',
    borderClass: 'border-rose-400/80',
    textColorClass: 'text-white',
    glowColor: 'rgba(225, 29, 72, 0.65)',
    shadowClass: 'shadow-lg shadow-rose-600/40',
    rarityBadgeClass: 'text-rose-300 border-rose-500/40 bg-rose-950/60',
    description: 'Merah Premium dengan efek Shine & Kilauan berdenyut.',
    animationClass: 'animate-pulse-glow',
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy',
    rarity: 'Legend',
    icon: '🌌',
    bgGradient: 'bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600',
    borderClass: 'border-purple-300/80',
    textColorClass: 'text-white',
    glowColor: 'rgba(147, 51, 234, 0.65)',
    shadowClass: 'shadow-lg shadow-purple-600/40',
    rarityBadgeClass: 'text-purple-300 border-purple-500/40 bg-purple-950/60',
    description: 'Gradasi Aurora Cosmos Merah-Biru-Ungu.',
    animationClass: 'animate-aurora',
  },
  royal_gold: {
    id: 'royal_gold',
    name: 'Royal Gold',
    rarity: 'Epic',
    icon: '👑',
    bgGradient: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600',
    borderClass: 'border-yellow-200',
    textColorClass: 'text-slate-950 font-black',
    glowColor: 'rgba(245, 158, 11, 0.7)',
    shadowClass: 'shadow-lg shadow-amber-500/50',
    rarityBadgeClass: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
    description: 'Emas Kerajaan Berkilau dengan Efek Metallic.',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    rarity: 'Rare',
    icon: '⚡',
    bgGradient: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600',
    borderClass: 'border-emerald-300/80',
    textColorClass: 'text-white',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    shadowClass: 'shadow-lg shadow-emerald-600/40',
    rarityBadgeClass: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
    description: 'Hijau Zamrud Murni dengan Glow Energetik.',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    rarity: 'Mythic',
    icon: '💎',
    bgGradient: 'bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300',
    borderClass: 'border-white',
    textColorClass: 'text-slate-950 font-black',
    glowColor: 'rgba(56, 189, 248, 0.8)',
    shadowClass: 'shadow-lg shadow-sky-400/60',
    rarityBadgeClass: 'text-sky-300 border-sky-400/40 bg-sky-950/60 font-bold',
    description: 'Putih & Biru Kristal Berlian Berketinggian Tinggi.',
  },
  absolute: {
    id: 'absolute',
    name: 'Absolute',
    rarity: 'Absolute',
    icon: '✨',
    bgGradient: 'bg-gradient-to-r from-fuchsia-400 via-violet-500 to-cyan-300',
    borderClass: 'border-fuchsia-200/90',
    textColorClass: 'text-white font-black',
    glowColor: 'rgba(255, 79, 216, 0.92)',
    shadowClass: 'shadow-xl',
    rarityBadgeClass: 'text-pink-50 border-pink-200/40 bg-pink-950/70 font-extrabold uppercase tracking-wider badge-glow',
    description: 'Theme Tertinggi - Pelangi Smooth Premium.',
    animationClass: 'animate-absolute-border animate-absolute-shadow',
  },
};
