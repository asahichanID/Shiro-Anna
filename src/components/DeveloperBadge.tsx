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

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative isolate overflow-visible">
        {isAbsolute && (
          <span
            aria-hidden="true"
            className="absolute -inset-4 rounded-full blur-2xl opacity-70 pointer-events-none animate-absolute-halo"
            style={{
              background:
                'linear-gradient(90deg, rgba(255, 79, 216, 0.42) 0%, rgba(139, 92, 246, 0.38) 28%, rgba(56, 189, 248, 0.34) 55%, rgba(52, 211, 153, 0.30) 78%, rgba(245, 158, 11, 0.26) 100%)',
            }}
          />
        )}

        <div
          className={`relative group overflow-hidden rounded-full border font-bold bg-slate-950/60 ${theme.borderClass} ${theme.textColorClass} ${theme.shadowClass} ${sizeClasses[size]} ${theme.animationClass || ''} transition-all duration-300 hover:scale-105 hover:brightness-110 cursor-pointer select-none inline-flex items-center justify-center`}
          style={{
            boxShadow: isAbsolute
              ? '0 0 18px rgba(255, 255, 255, 0.14), 0 0 28px rgba(236, 72, 153, 0.78), 0 0 52px rgba(139, 92, 246, 0.46), 0 0 78px rgba(56, 189, 248, 0.24)'
              : `0 0 16px ${theme.glowColor}, 0 0 32px ${theme.glowColor}`,
          }}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-0 ${theme.bgGradient} ${isAbsolute ? 'animate-absolute-bg' : ''} pointer-events-none`}
            style={isAbsolute ? { backgroundSize: '280% 280%' } : undefined}
          />

          {isAbsolute && (
            <span
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-55 mix-blend-screen animate-absolute-softlight"
              style={{
                background:
                  'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 18%, transparent 48%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.14) 0%, transparent 34%)',
              }}
            />
          )}

          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
            }}
          />

          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-badge-shine pointer-events-none" />

          <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
            <span className={`${iconSizes[size]} flex-shrink-0 group-hover:rotate-12 transition-transform duration-300`}>
              {icon}
            </span>

            <span className="tracking-wide drop-shadow-sm flex items-center gap-1">
              {badgeName}
            </span>

            <Sparkles className="w-3 h-3 text-amber-200/90 animate-pulse flex-shrink-0" />
          </span>
        </div>
      </div>

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
