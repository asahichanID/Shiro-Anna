import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Crown,
  Sparkles,
  ShoppingBag,
  Coins,
  CircleDollarSign,
  Check,
  Edit3,
  BadgePlus,
  Shield,
  Eye,
  X,
  MessageSquare,
  Users,
  Globe,
  Bot,
  User,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import {
  BADGE_CATALOG,
  PREMIUM_PLANS,
  BadgeId,
  PremiumPlanId,
  getBadgeDefinition,
  getOwnedBadge,
  premiumUntilToText,
  type BadgeDefinition,
} from '../config/userBadges';
import { BadgePill } from './BadgePill';

const formatCoins = (value: number) => value.toLocaleString('id-ID');

export const ShopView: React.FC = () => {
  const { profile, purchaseBadge, equipBadge, renameBadge, purchasePremium, isPremiumActive } = useProfile();
  const [activeSection, setActiveSection] = useState<'welcome' | 'badge' | 'premium'>('welcome');
  const [selectedBadge, setSelectedBadge] = useState<BadgeId | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [previewBadgeId, setPreviewBadgeId] = useState<BadgeId | null>(null);

  const coins = profile?.coins || 0;
  const ownedBadges = profile?.badgeInventory || [];
  const equippedBadge = getOwnedBadge(ownedBadges, profile?.equippedBadgeId || null);
  const activeBadgeDef = getBadgeDefinition(equippedBadge?.id || profile?.equippedBadgeId || null);
  const isDeveloper = profile?.role === 'Developer' || profile?.username?.toLowerCase() === 'shiro anna';

  const rareBadges = useMemo(() => BADGE_CATALOG.filter((b) => b.tier === 'Rare'), []);
  const epicBadges = useMemo(() => BADGE_CATALOG.filter((b) => b.tier === 'Epic'), []);
  const legendBadges = useMemo(() => BADGE_CATALOG.filter((b) => b.tier === 'Legend' && !b.isDeveloperOnly), []);
  const developerBadges = useMemo(() => BADGE_CATALOG.filter((b) => b.isDeveloperOnly), []);

  const handleBuyBadge = (badgeId: BadgeId) => {
    const result = purchaseBadge(badgeId);
    setNotice(result.success ? 'Badge berhasil dipakai / diambil ✨' : result.error || 'Gagal memproses badge.');
    if (result.success) {
      setActiveSection('badge');
      setSelectedBadge(badgeId);
      setRenameValue(getBadgeDefinition(badgeId)?.displayName || '');
    }
  };

  const handleBuyPremium = (planId: PremiumPlanId) => {
    const result = purchasePremium(planId);
    setNotice(result.success ? 'Premium aktif dengan manis ✨' : result.error || 'Gagal membeli premium.');
    if (result.success) setActiveSection('premium');
  };

  const handleRename = (badgeId: BadgeId) => {
    const result = renameBadge(badgeId, renameValue);
    setNotice(result.success ? 'Nama badge diperbarui.' : result.error || 'Gagal mengganti nama badge.');
  };

  const renderBadgeCard = (badge: BadgeDefinition) => {
    const owned = getOwnedBadge(ownedBadges, badge.id);
    const affordable = coins >= badge.price;
    const isEquipped = profile?.equippedBadgeId === badge.id;
    const canTakeNow = !badge.isDeveloperOnly || isDeveloper;
    const buttonText = badge.isDeveloperOnly
      ? isDeveloper
        ? owned
          ? 'Sudah Diambil'
          : 'Ambil'
        : 'Tidak bisa di beli'
      : owned
        ? 'Sudah Dimiliki'
        : affordable
          ? 'Beli Sekarang'
          : 'Coin kurang';

    return (
      <div
        key={badge.id}
        className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/40 transition hover:-translate-y-0.5 hover:border-slate-700/80"
        onClick={() => setPreviewBadgeId(badge.id)}
        role="button"
        tabIndex={0}
      >
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${badge.bgClass.replace('bg-gradient-to-r ', '')} opacity-90`} />
        <div className="absolute inset-0 pointer-events-none opacity-50" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BadgePill badgeId={badge.id} compact />
              <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400">{badge.tier}</span>
            </div>
            <h3 className="mt-3 text-lg font-black text-white">{badge.displayName}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{badge.description}</p>
            {badge.previewNote && (
              <p className="mt-2 text-[11px] leading-relaxed text-red-300/90">
                {badge.previewNote}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-right">
            <div className="flex items-center gap-1 font-black text-amber-300">
              <CircleDollarSign className="h-4 w-4 text-amber-400" />
              {badge.price > 0 ? formatCoins(badge.price) : 'Gratis'}
            </div>
            <p className="text-[10px] text-slate-500">Coin Carrot</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {badge.colors.map((c) => (
            <span key={c} className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: c }} />
          ))}
          <span className="text-[11px] text-slate-500">
            Animasi:{' '}
            {badge.kind === 'plain'
              ? 'polos'
              : badge.kind === 'shine'
                ? 'shine lembut'
                : badge.kind === 'rainbowPulse'
                  ? 'rainbow pulse'
                  : badge.kind === 'flame'
                    ? 'flame cepat'
                    : 'admin merah retak'}
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          {owned ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Sudah dimiliki
                </span>
                {isEquipped && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    Dipakai
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  value={selectedBadge === badge.id ? renameValue : owned.customName}
                  onFocus={() => {
                    setSelectedBadge(badge.id);
                    setRenameValue(owned.customName);
                  }}
                  onChange={(e) => {
                    setSelectedBadge(badge.id);
                    setRenameValue(e.target.value.slice(0, 7));
                  }}
                  maxLength={7}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sky-500"
                  placeholder="Nama badge"
                />
                <button
                  type="button"
                  onClick={() => handleRename(badge.id)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 transition hover:bg-slate-700"
                  title="Simpan nama"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  equipBadge(badge.id);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:scale-[1.01]"
              >
                Pakai Badge
              </button>
            </div>
          ) : (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  if (!badge.isDeveloperOnly && affordable) handleBuyBadge(badge.id);
                  if (badge.isDeveloperOnly && isDeveloper && canTakeNow) handleBuyBadge(badge.id);
                }}
                disabled={badge.isDeveloperOnly ? !isDeveloper : !affordable}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  badge.isDeveloperOnly
                    ? isDeveloper
                      ? 'bg-gradient-to-r from-red-500 via-rose-600 to-red-950 text-white hover:scale-[1.01]'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : affordable
                      ? 'bg-gradient-to-r from-slate-200 via-slate-100 to-white text-slate-950 hover:scale-[1.01]'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                {buttonText}
              </button>
              {badge.isDeveloperOnly && !isDeveloper && (
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Badge ini cuma bisa diambil kalau admin mengizinkan atau memakai mode khusus untuk mengambil langsung.
                </p>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>{badge.isDeveloperOnly ? 'Eksklusif admin' : 'Siap dibeli'}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewBadgeId(badge.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderPremiumCard = (plan: (typeof PREMIUM_PLANS)[number]) => {
    const affordable = coins >= plan.price;
    const active = !!profile?.premiumUntil && profile.premiumUntil > Date.now();

    return (
      <div key={plan.id} className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/40">
        <div className={`absolute inset-x-0 top-0 h-1 ${plan.bgClass} opacity-95`} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] ${plan.borderClass} ${plan.textClass} ${plan.animationClass || ''}`}
                style={{ backgroundImage: `linear-gradient(90deg, ${plan.colors.join(', ')})`, backgroundSize: '220% 220%' }}
              >
                Premium
              </span>
              {active && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  Aktif
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-black text-white">{plan.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{plan.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-right">
            <div className="flex items-center gap-1 font-black text-amber-300">
              <CircleDollarSign className="h-4 w-4 text-amber-400" />
              {formatCoins(plan.price)}
            </div>
            <p className="text-[10px] text-slate-500">{plan.durationLabel}</p>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {plan.benefits.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <BadgeCheck className="h-4 w-4 text-cyan-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => handleBuyPremium(plan.id)}
          disabled={!affordable}
          className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-black transition ${
            affordable
              ? 'bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 text-white hover:scale-[1.01]'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          {affordable ? 'Aktifkan Premium' : 'Coin kurang'}
        </button>
      </div>
    );
  };

  const previewBadge = previewBadgeId ? getBadgeDefinition(previewBadgeId) : undefined;
  const previewOwned = previewBadge ? getOwnedBadge(ownedBadges, previewBadge.id) : undefined;
  const previewDisplayBadge = previewBadge
    ? previewOwned
      ? <BadgePill badgeId={previewBadge.id} ownedBadge={previewOwned} />
      : <BadgePill badgeId={previewBadge.id} />
    : null;

  const previewSamples = previewBadge
    ? [
        {
          icon: <Globe className="h-4 w-4 text-cyan-400" />,
          title: 'Global Chat',
          text: `${profile?.username || 'Trainer'}: badge ini kelihatan halus banget di chat global.`,
        },
        {
          icon: <Users className="h-4 w-4 text-violet-400" />,
          title: 'Chat Friend',
          text: `${profile?.username || 'Trainer'}: cocok banget buat dipamerin di chat teman.`,
        },
        {
          icon: <Bot className="h-4 w-4 text-amber-400" />,
          title: 'Chat Bot',
          text: `Oguri Cap: badge ${previewBadge.displayName} tampil rapi di profile dan pesan bot.`,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl shadow-slate-950/60">
        <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
              <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" />
              Selamat datang ke Shop
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Shop Carrot yang terasa lebih{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200 bg-clip-text text-transparent">
                premium
              </span>
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Pilih badge eksklusif, atur nama pendek maksimal 7 huruf, lalu pakai langsung di profile dan chat. Semua dibuat halus, terang, dan elegan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Coin Carrot</div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-black text-amber-200">
                <Coins className="h-6 w-6 text-amber-400" />
                {formatCoins(coins)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Badge aktif</div>
              <div className="mt-2 min-h-8">{activeBadgeDef ? <BadgePill badgeId={activeBadgeDef.id} ownedBadge={equippedBadge} /> : <span className="text-sm text-slate-500">Belum ada</span>}</div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Premium</div>
              <div className="mt-1 text-sm font-bold text-white">{isPremiumActive ? 'Aktif' : 'Nonaktif'}</div>
              <div className="text-[10px] text-slate-500">{premiumUntilToText(profile?.premiumUntil || null)}</div>
            </div>
          </div>
        </div>

        {notice && (
          <div className="relative z-10 mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            {notice}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveSection('welcome')}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
            activeSection === 'welcome'
              ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Welcome
        </button>
        <button
          onClick={() => setActiveSection('badge')}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
            activeSection === 'badge'
              ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Badge
        </button>
        <button
          onClick={() => setActiveSection('premium')}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
            activeSection === 'premium'
              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Premium
        </button>
      </div>

      {activeSection === 'welcome' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <BadgePlus className="h-4 w-4 text-cyan-400" />
              Badge Shop
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Ada 3 badge Rare, 3 Epic, dan 2 Legend, plus 1 badge admin khusus di bagian paling bawah. Rare dimulai dari 🥕 5.000, Epic 🥕 15.000, dan Legend 🥕 35.000.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {BADGE_CATALOG.slice(0, 3).map((badge) => (
                <BadgePill key={badge.id} badgeId={badge.id} />
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Crown className="h-4 w-4 text-amber-400" />
              Premium Shop
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Premium dibuat lebih tenang dan eksklusif. Cocok buat yang suka tampilan lebih rapi dan lembut.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {PREMIUM_PLANS.map((plan) => (
                <div key={plan.id} className={`rounded-2xl border p-3 ${plan.borderClass} bg-slate-950/70`}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{plan.durationLabel}</div>
                  <div className="mt-2 text-sm font-bold text-white">{plan.name}</div>
                  <div className="text-xs text-amber-200">🥕 {formatCoins(plan.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'badge' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-white">Badge Rare</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rareBadges.map((b) => renderBadgeCard(b))}</div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Badge Epic</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{epicBadges.map((b) => renderBadgeCard(b))}</div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Badge Legend</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">{legendBadges.map((b) => renderBadgeCard(b))}</div>
          </div>
          <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/50 via-slate-950 to-slate-900 p-5 shadow-lg shadow-red-950/20">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-300" />
              <h3 className="text-xl font-black text-white">Badge Admin / Dev</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Badge ini khusus buat admin/developer. Kalau akun berizin, tombolnya berubah jadi <span className="font-bold text-red-200">Ambil</span>. Kalau bukan, statusnya tetap pajangan dan tidak bisa dibeli.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{developerBadges.map((b) => renderBadgeCard(b))}</div>
          </div>
        </div>
      )}

      {activeSection === 'premium' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PREMIUM_PLANS.map((plan) => renderPremiumCard(plan))}
        </div>
      )}

      {profile?.badgeInventory && profile.badgeInventory.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Inventory Badge</h3>
              <p className="text-sm text-slate-400">Semua badge yang sudah dimiliki.</p>
            </div>
            <BadgePill badgeId={profile.equippedBadgeId || null} ownedBadge={equippedBadge} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {profile.badgeInventory.map((badge) => (
              <button
                key={badge.id}
                type="button"
                onClick={() => {
                  setSelectedBadge(badge.id);
                  setRenameValue(badge.customName);
                  equipBadge(badge.id);
                }}
                className={`rounded-2xl border px-3 py-2 text-left transition hover:scale-[1.01] ${
                  profile.equippedBadgeId === badge.id
                    ? 'border-emerald-400/50 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-950/60 hover:bg-slate-800'
                }`}
              >
                <BadgePill badgeId={badge.id} ownedBadge={badge} compact />
              </button>
            ))}
          </div>
        </div>
      )}

      {previewBadge && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-md sm:items-center" onClick={() => setPreviewBadgeId(null)}>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-900" />
            <button
              type="button"
              onClick={() => setPreviewBadgeId(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5 p-6 sm:p-8">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-cyan-400" />
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Preview badge</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={profile?.avatar || '/assets/avatar.png'}
                      alt={profile?.username || 'User'}
                      className="h-20 w-20 rounded-2xl border border-slate-700 object-cover shadow-lg shadow-black/30"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-black text-white">{profile?.username || 'Trainer Sensei'}</h3>
                        {previewDisplayBadge}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">ID {profile?.id || '#preview'}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Badge yang dipilih akan tampil di posisi profile yang sama seperti biasanya. Kalau custom name sudah diubah, teksnya ikut kebawa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/35 via-slate-900 to-slate-950 p-5">
                  <div className="flex items-center gap-2">
                    <BadgePlus className="h-4 w-4 text-red-300" />
                    <h4 className="text-sm font-black uppercase tracking-[0.25em] text-red-200">Contoh tampilan badge</h4>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {previewDisplayBadge}
                    <span className="text-sm text-slate-400">{previewBadge.previewNote || previewBadge.description}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 bg-slate-950/90 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  <h4 className="text-lg font-black text-white">Contoh chat</h4>
                </div>
                <div className="mt-5 space-y-3">
                  {previewSamples.map((sample) => (
                    <div key={sample.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        {sample.icon}
                        {sample.title}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-200">{sample.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-400">
                  Preview ini cuma buat lihat gaya badge, posisi badge, dan contoh tampil di beberapa chat. Kamu masih bisa ubah nama badge dari form yang ada kalau badge-nya sudah dimiliki.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
