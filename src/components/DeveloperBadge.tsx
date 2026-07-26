import React from 'react';
import { BADGE_THEMES, BadgeThemeId } from '../config/badgeThemes';
import { Sparkles } from 'lucide-react';

interface DeveloperBadgeProps {
  badgeName?: string;
  themeId?: BadgeThemeId;
  iconOverride?: string;
  showRarity?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DeveloperBadge: React.FC<DeveloperBadgeProps> = ({
  badgeName = 'Ruby Developer',
  themeId = 'ruby',
  iconOverride,
  showRarity = true,
  size = 'md',
  className = '',
}) => {
  const theme = BADGE_THEMES[themeId] || BADGE_THEMES.ruby;
  const icon = iconOverride || theme.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3.5 py-1 text-xs gap-1.5',
    lg: 'px-5 py-2 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      {/* Main Badge Container */}
      <div
        className={`relative group overflow-hidden rounded-full border font-bold ${theme.bgGradient} ${theme.borderClass} ${theme.textColorClass} ${theme.shadowClass} ${sizeClasses[size]} ${theme.animationClass || ''} transition-all duration-300 hover:scale-105 hover:brightness-110 cursor-pointer select-none inline-flex items-center justify-center`}
        style={{
          boxShadow: `0 0 16px ${theme.glowColor}, 0 0 32px ${theme.glowColor}`,
        }}
      >
        {/* Glow backdrop overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Shine Animation Light Bar (runs every ~2s) */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-badge-shine pointer-events-none" />

        {/* Icon */}
        <span className={`${iconSizes[size]} flex-shrink-0 group-hover:rotate-12 transition-transform duration-300`}>
          {icon}
        </span>

        {/* Badge Label */}
        <span className="tracking-wide drop-shadow-sm flex items-center gap-1">
          {badgeName}
        </span>

        {/* Small Sparkle */}
        <Sparkles className="w-3 h-3 text-amber-200/90 animate-pulse flex-shrink-0" />
      </div>

      {/* Rarity Tag */}
      {showRarity && (
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${theme.rarityBadgeClass} shadow-sm backdrop-blur-md`}
        >
          {theme.rarity}
        </span>
      )}
    </div>
  );
};
