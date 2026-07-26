import React from 'react';
import { BadgeDefinition, OwnedBadge, getBadgeDefinition, resolveBadgeLabel } from '../config/userBadges';
import { Sparkles } from 'lucide-react';

interface BadgePillProps {
  badgeId?: string | null;
  ownedBadge?: OwnedBadge | null;
  definition?: BadgeDefinition | null;
  compact?: boolean;
  className?: string;
}

export const BadgePill: React.FC<BadgePillProps> = ({
  badgeId,
  ownedBadge,
  definition,
  compact = false,
  className = '',
}) => {
  const resolvedDef = definition || getBadgeDefinition(ownedBadge?.id || badgeId || null);
  if (!resolvedDef) return null;

  const label = resolveBadgeLabel(ownedBadge || undefined, badgeId || resolvedDef.id);

  const bgStyle: React.CSSProperties = {
    backgroundImage:
      resolvedDef.kind === 'plain'
        ? `linear-gradient(135deg, ${resolvedDef.colors[0]}, ${resolvedDef.colors[1]})`
        : resolvedDef.kind === 'shine'
        ? `linear-gradient(135deg, ${resolvedDef.colors[0]}, ${resolvedDef.colors[1]}, ${resolvedDef.colors[2]})`
        : resolvedDef.kind === 'flame'
        ? `linear-gradient(90deg, ${resolvedDef.colors.join(', ')})`
        : `linear-gradient(90deg, ${resolvedDef.colors[0]}, ${resolvedDef.colors[1]}, ${resolvedDef.colors[2]}, ${resolvedDef.colors[1]}, ${resolvedDef.colors[0]})`,
    backgroundSize: resolvedDef.kind === 'plain' ? '100% 100%' : '240% 240%',
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(255,255,255,0.12), 0 0 20px rgba(255,255,255,0.08)`,
  };

  const sizeClass = compact
    ? 'px-2 py-0.5 text-[9px] gap-1'
    : 'px-3 py-1 text-[11px] gap-1.5';

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span
        className={`absolute -inset-1 rounded-full blur-lg opacity-80 pointer-events-none ${resolvedDef.animationClass || ''}`}
        style={{
          backgroundImage: bgStyle.backgroundImage,
          backgroundSize: bgStyle.backgroundSize,
          opacity: resolvedDef.kind === 'plain' ? 0.4 : 0.65,
        }}
      />
      <span
        className={`relative inline-flex items-center rounded-full border font-black tracking-wide transition-all duration-500 ${sizeClass} ${resolvedDef.bgClass} ${resolvedDef.textClass} ${resolvedDef.borderClass} ${resolvedDef.glowClass} ${resolvedDef.animationClass || ''}`}
        style={bgStyle}
      >
        <Sparkles className={`w-2.5 h-2.5 ${resolvedDef.kind === 'plain' ? 'opacity-70' : 'opacity-95'}`} />
        <span className="whitespace-nowrap">{label}</span>
      </span>
    </span>
  );
};
