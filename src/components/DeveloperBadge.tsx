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
  const isAbsolute = themeId === 'absolute';

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

  const baseBadgeClasses = [
    'relative group overflow-hidden rounded-full border font-bold inline-flex items-center justify-center select-none',
    'transition-all duration-300 hover:scale-105 hover:brightness-110 cursor-pointer',
    sizeClasses[size],
    isAbsolute ? 'border-white/65 text-white shadow-[0_0_24px_rgba(255,255,255,0.18)]' : `${theme.borderClass} ${theme.textColorClass} ${theme.shadowClass}`,
  ].join(' ');

  const outerHaloStyle = isAbsolute
    ? {
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 14%, rgba(255,96,230,0.30) 26%, rgba(119,113,255,0.22) 40%, rgba(75,213,255,0.18) 54%, rgba(77,255,167,0.16) 68%, rgba(255,225,92,0.14) 80%, transparent 100%)',
      }
    : {
        background: `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
      };

  const mainFillStyle = isAbsolute
    ? {
        backgroundImage:
          'linear-gradient(135deg, #ff52c4 0%, #c66bff 18%, #7b6dff 35%, #4ecbff 53%, #4dffb0 70%, #ffe55c 86%, #ff52c4 100%)',
      }
    : undefined;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      {/* Main Badge Container */}
      <div
        className={`${baseBadgeClasses} ${theme.animationClass || ''}`}
        style={{
          boxShadow: isAbsolute
            ? '0 0 18px rgba(255, 255, 255, 0.22), 0 0 36px rgba(255, 105, 238, 0.22), 0 0 58px rgba(96, 165, 250, 0.16)'
            : `0 0 16px ${theme.glowColor}, 0 0 32px ${theme.glowColor}`,
        }}
      >
        {/* Outer halo layer */}
        <div
          className={`absolute -inset-2 z-0 rounded-full opacity-70 pointer-events-none ${isAbsolute ? 'animate-absolute-halo blur-2xl' : 'group-hover:opacity-100 transition-opacity duration-300'}`}
          style={outerHaloStyle}
        />

        {/* Premium sheen layer */}
        <div
          className={`absolute inset-0 z-0 pointer-events-none ${isAbsolute ? 'animate-absolute-sheen' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-300'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </div>

        {/* Main background fill */}
        <div
          className={`absolute inset-0 z-0 rounded-full ${isAbsolute ? 'animate-absolute-rainbow' : theme.bgGradient}`}
          style={mainFillStyle}
        />

        {/* Soft inner gloss to keep it premium */}
        <div
          className={`absolute inset-[1px] z-0 rounded-full pointer-events-none ${isAbsolute ? 'bg-white/10 backdrop-blur-[2px]' : 'bg-black/10'}`}
        />

        {/* Glow backdrop overlay on hover */}
        <div
          className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: isAbsolute
              ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 22%, transparent 68%)'
              : `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <span className={`${iconSizes[size]} relative z-10 flex-shrink-0 group-hover:rotate-12 transition-transform duration-300`}>
          {icon}
        </span>

        {/* Badge Label */}
        <span className="relative z-10 tracking-wide drop-shadow-sm flex items-center gap-1">
          {badgeName}
        </span>

        {/* Small Sparkle */}
        <Sparkles className={`relative z-10 w-3 h-3 flex-shrink-0 ${isAbsolute ? 'text-white/90 animate-pulse' : 'text-amber-200/90 animate-pulse'}`} />
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
