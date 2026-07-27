import React from 'react';
import { ALL_BADGES, BADGE_MAP, BadgeConfig } from '../config/badgeThemes';
import { Sparkles, Flame } from 'lucide-react';

interface DeveloperBadgeProps {
  badgeId?: string;
  badgeName?: string;
  showRarity?: boolean;
  size?: 'sm' | 'md' | 'lg';
  streak?: number;
  className?: string;
}

export const DeveloperBadge: React.FC<DeveloperBadgeProps> = ({
  badgeId = 'ruby',
  badgeName,
  showRarity = true,
  size = 'md',
  streak = 0,
  className = '',
}) => {
  const badgeConfig: BadgeConfig = BADGE_MAP[badgeId] || ALL_BADGES[0];
  const displayName = badgeName && badgeName.trim().length > 0 ? badgeName : badgeConfig.name;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Streak Badge if streak > 0 */}
      {streak > 0 && (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 border border-amber-300 shadow-sm animate-pulse">
          <Flame className="w-3 h-3 fill-amber-300 text-amber-950" />
          <span>x{streak}</span>
        </span>
      )}

      {/* Main Badge */}
      <div className="inline-flex flex-col items-center gap-0.5">
        <div
          className={`relative group overflow-hidden rounded-full border font-extrabold ${badgeConfig.bgGradient} ${badgeConfig.borderClass} ${badgeConfig.textColorClass} ${badgeConfig.shadowClass} ${sizeClasses[size]} transition-all duration-300 hover:scale-105 cursor-pointer select-none inline-flex items-center justify-center`}
          style={{
            boxShadow: `0 0 12px ${badgeConfig.glowColor}`,
          }}
        >
          {/* Legendary Rainbow Pulse animation overlay */}
          {badgeConfig.hasRainbowPulse && (
            <span
              className="absolute inset-0 pointer-events-none opacity-80 animate-pulse"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(239, 68, 68, 0.8) 0%, rgba(245, 158, 11, 0.8) 25%, rgba(16, 185, 129, 0.8) 50%, rgba(168, 85, 247, 0.8) 75%, rgba(59, 130, 246, 0.8) 100%)',
                backgroundSize: '200% 200%',
                animation: 'rainbowSpread 3s ease-in-out infinite alternate',
              }}
            />
          )}

          {/* Epic/Legendary Light Shine Bar every ~2s */}
          {badgeConfig.hasShine && (
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
              style={{
                animation: 'badgeShine 2.2s ease-in-out infinite',
              }}
            />
          )}

          {/* Badge Icon */}
          <span className={`${iconSizes[size]} flex-shrink-0 z-10`}>
            {badgeConfig.icon}
          </span>

          {/* Badge Name */}
          <span className="tracking-wide drop-shadow z-10 whitespace-nowrap">
            {displayName}
          </span>

          {/* Sparkle Icon for Epic/Legend/Dev */}
          {(badgeConfig.rarity === 'Epic' || badgeConfig.rarity === 'Legendary' || badgeConfig.rarity === 'Developer') && (
            <Sparkles className="w-3 h-3 text-amber-200/90 animate-spin z-10 flex-shrink-0" />
          )}
        </div>

        {/* Optional Rarity Tag */}
        {showRarity && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase tracking-widest border ${badgeConfig.rarityBadgeClass}`}
          >
            {badgeConfig.rarity}
          </span>
        )}
      </div>

      <style>{`
        @keyframes badgeShine {
          0% { transform: translateX(-100%); }
          20% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rainbowSpread {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};
