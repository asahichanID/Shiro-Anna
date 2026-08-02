import React, { useState } from 'react';
import {
  MessageCircle,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Globe,
  Radio,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Award,
  Layers,
  Clock,
  ChevronRight,
  Headset,
} from 'lucide-react';
import { SERVICE_PROFILE } from '../config/serviceProfile';
import { BADGE_THEMES, BadgeThemeId } from '../config/badgeThemes';
import { DeveloperBadge } from './DeveloperBadge';

export const ServiceView: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState<BadgeThemeId>(
    SERVICE_PROFILE.badgeThemeId
  );
  const [badgeText, setBadgeText] = useState<string>(SERVICE_PROFILE.badgeName);

  const activeTheme = BADGE_THEMES[selectedThemeId] || BADGE_THEMES.ruby;

  const handleWhatsAppClick = () => {
    window.open(SERVICE_PROFILE.whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Service Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-sm">
              <Headset className="w-4 h-4 text-amber-400 animate-bounce-slow" />
              <span>Official Developer & Support Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Oguri Cap Service Hub
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Pusat bantuan resmi, status sistem API Worker, serta informasi kontak Developer untuk konsultasi dan dukungan teknis Oguri Cap Web App.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleWhatsAppClick}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-slate-950" />
              <span>Hubungi Developer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Card & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Profile Card (Glassmorphism) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 transition-all hover:border-amber-500/30">
            {/* Glassmorphism ambient glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Profile Avatar & Info Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/60 p-1 bg-slate-950 shadow-xl shadow-amber-500/10 relative">
                  <img
                    src={SERVICE_PROFILE.avatarUrl}
                    alt={SERVICE_PROFILE.name}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1';
                    }}
                  />
                </div>
                {/* Status Dot */}
                <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-emerald-500/50 text-[10px] font-bold text-emerald-400 flex items-center gap-1 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{SERVICE_PROFILE.status}</span>
                </span>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                      {SERVICE_PROFILE.name}
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                    </h3>
                    <p className="text-xs text-amber-400 font-semibold tracking-wide mt-0.5">
                      Oguri Cap Lead Creator
                    </p>
                  </div>
                </div>

                {/* Developer Badge Component */}
                <div className="pt-1 flex justify-center sm:justify-start">
                  <DeveloperBadge
                    badgeName={badgeText}
                    themeId={selectedThemeId}
                    iconOverride={SERVICE_PROFILE.badgeIconOverride}
                    size="md"
                  />
                </div>

                {/* Bio */}
                <p className="text-sm text-slate-300 leading-relaxed pt-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  "{SERVICE_PROFILE.bio}"
                </p>
              </div>
            </div>

            {/* Large WhatsApp Action Button */}
            <div className="pt-2">
              <button
                onClick={handleWhatsAppClick}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-white font-extrabold text-base py-4 px-6 rounded-xl shadow-xl shadow-emerald-600/30 border border-emerald-400/40 flex items-center justify-center space-x-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {/* Ripple Effect Animation */}
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <span className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-badge-shine" />

                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                    WhatsApp Support Direct
                  </span>
                  <span className="text-base font-extrabold tracking-wide">
                    Hubungi via WhatsApp ({SERVICE_PROFILE.whatsappNumber})
                  </span>
                </div>

                <ExternalLink className="w-5 h-5 ml-auto opacity-80 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Quick Contact Info */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-slate-400 text-[10px]">Response Time</div>
                  <div className="font-semibold text-slate-200">24/7 Priority Support</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-2.5">
                <Globe className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <div>
                  <div className="text-slate-400 text-[10px]">Location</div>
                  <div className="font-semibold text-slate-200">Indonesia 🇮🇩</div>
                </div>
              </div>
            </div>
          </div>

          {/* Badge Theme Customizer & Showcase */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Developer Badge Theme Selector
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                {Object.keys(BADGE_THEMES).length} Themes Available
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Pilih Theme Badge untuk melihat tampilan visual kilauan dan efek glow secara live:
            </p>

            {/* Theme Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {(Object.keys(BADGE_THEMES) as BadgeThemeId[]).map((themeId) => {
                const item = BADGE_THEMES[themeId];
                const isSelected = selectedThemeId === themeId;

                return (
                  <button
                    key={themeId}
                    onClick={() => {
                      setSelectedThemeId(themeId);
                      setBadgeText(item.name);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {item.rarity}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Currently Active Theme Display */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <span className="text-slate-500">Active Theme:</span>{' '}
                <strong className="text-amber-300">{activeTheme.name}</strong> ({activeTheme.rarity})
              </div>
              <DeveloperBadge
                badgeName={badgeText}
                themeId={selectedThemeId}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Right Column: System & Worker Info Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                System & API Monitor
              </h4>
            </div>

            {/* System Info List */}
            <div className="space-y-3">
              {/* Version */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>App Version</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30">
                  {SERVICE_PROFILE.systemInfo.version}
                </span>
              </div>

              {/* API Status */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>API Status</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{SERVICE_PROFILE.systemInfo.apiStatus}</span>
                </span>
              </div>

              {/* Worker Status */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 text-slate-300">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>Worker Service</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{SERVICE_PROFILE.systemInfo.workerStatus}</span>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-sky-300/90 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 truncate flex items-center justify-between">
                  <span className="truncate">{SERVICE_PROFILE.systemInfo.workerUrl}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1" />
                </div>
              </div>

              {/* Response Time */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                  <Radio className="w-4 h-4 text-rose-400" />
                  <span>Response Time</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 px-2.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30">
                  {SERVICE_PROFILE.systemInfo.responseTime}
                </span>
              </div>

              {/* Region */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs text-slate-300">
                  <Globe className="w-4 h-4 text-teal-400" />
                  <span>Server Region</span>
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  {SERVICE_PROFILE.systemInfo.serverRegion}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Panduan Konfigurasi Developer</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Semua data profile, badge, bio, dan status layanan pada halaman Service ini dapat disesuaikan kapan saja secara modular tanpa menyentuh logic utama aplikasi.
            </p>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-300 pt-1">
              <div className="flex items-center gap-1.5 text-amber-300">
                <ChevronRight className="w-3 h-3" />
                <span>src/config/serviceProfile.ts</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-300">
                <ChevronRight className="w-3 h-3" />
                <span>src/config/badgeThemes.ts</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
