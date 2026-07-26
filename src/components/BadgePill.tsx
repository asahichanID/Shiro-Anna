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
        : resolvedDef.kind === 'devPulse'
        ? 'linear-gradient(135deg, #ff5b5b 0%, #8f0d18 52%, #220006 100%)'
        : `linear-gradient(90deg, ${resolvedDef.colors[0]}, ${resolvedDef.colors[1]}, ${resolvedDef.colors[2]}, ${resolvedDef.colors[1]}, ${resolvedDef.colors[0]})`,
    backgroundSize: resolvedDef.kind === 'plain' || resolvedDef.kind === 'devPulse' ? '100% 100%' : '240% 240%',
    boxShadow: resolvedDef.kind === 'devPulse'
      ? 'inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(255,255,255,0.08), 0 0 24px rgba(239,68,68,0.22)'
      : `inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(255,255,255,0.12), 0 0 20px rgba(255,255,255,0.08)`,
  };

  const sizeClass = compact
    ? 'px-2 py-0.5 text-[9px] gap-1'
    : 'px-3 py-1 text-[11px] gap-1.5';

  if (resolvedDef.kind === 'devPulse') {
    return (
      <span className={`relative inline-flex items-center ${className}`}>
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-full border border-red-300/40 font-black tracking-wide transition-all duration-500 ${sizeClass} text-white ${resolvedDef.animationClass || ''}`}
          style={bgStyle}
        >
          <span className="absolute inset-0 rounded-full opacity-75 pointer-events-none animate-dev-badge-wipe" style={{ background: 'linear-gradient(135deg, rgba(255,91,91,0.95) 0%, rgba(143,13,24,0.86) 52%, rgba(34,0,6,0.96) 100%)' }} />
          <span className="absolute inset-0 pointer-events-none opacity-90">
            <span className="absolute left-[10%] top-[20%] h-px w-[62%] -rotate-12 bg-white/18 blur-[0.5px]" />
            <span className="absolute left-[18%] top-[32%] h-px w-[72%] rotate-6 bg-white/14 blur-[0.5px]" />
            <span className="absolute left-[12%] top-[45%] h-px w-[78%] -rotate-[18deg] bg-white/10 blur-[0.5px]" />
            <span className="absolute left-[8%] top-[58%] h-px w-[70%] rotate-[14deg] bg-white/12 blur-[0.5px]" />
            <span className="absolute left-[20%] top-[68%] h-px w-[60%] -rotate-[8deg] bg-white/16 blur-[0.5px]" />
            <span className="absolute left-[28%] top-[76%] h-px w-[48%] rotate-[22deg] bg-white/12 blur-[0.5px]" />
            <span className="absolute left-[34%] top-[86%] h-px w-[40%] -rotate-[26deg] bg-white/10 blur-[0.5px]" />
          </span>
          <span className="relative whitespace-nowrap">{label}</span>
        </span>
      </span>
    );
  }

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
        {resolvedDef.showIcon === false ? null : <Sparkles className={`w-2.5 h-2.5 ${resolvedDef.kind === 'plain' ? 'opacity-70' : 'opacity-95'}`} />}
        <span className="whitespace-nowrap">{label}</span>
      </span>
    </span>
  );
};
