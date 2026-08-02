import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, History, Coins, CheckCircle2, XCircle, AlertCircle, Sparkles, RefreshCw, ChevronRight, User, Hash, Award, ShieldCheck, Flame, MessageSquare } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { SettingsService } from '../services/SettingsService';
import { ShopProduct, ShopOrder, CoinHistoryItem } from '../types';
import { ALL_BADGES, BADGE_MAP, BadgeConfig, BadgeRarity } from '../config/badgeThemes';
import { DeveloperBadge } from './DeveloperBadge';
import { RealtimeService } from '../services/SupabaseService';
import { SHOP_MAINTENANCE_MANUAL_OVERRIDE, SHOP_MAINTENANCE_MESSAGE, SHOP_MAINTENANCE_DEV_NOTE } from '../config/shopMaintenance';

export const ShopView: React.FC = () => {
  const { profile, updateCoins } = useProfile();
  const isDeveloper =
    profile?.id === '#1' ||
    profile?.role === 'Developer' ||
    profile?.username?.toLowerCase() === 'shiro anna';

  const [activeTab, setActiveTab] = useState<'premium' | 'badge' | 'riwayat'>('premium');
  const [historySubTab, setHistorySubTab] = useState<'orders' | 'coins'>('orders');
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<'All' | BadgeRarity>('All');
  const [shopMaintenanceEnabled, setShopMaintenanceEnabled] = useState<boolean>(SHOP_MAINTENANCE_MANUAL_OVERRIDE);
  const [shopMaintenanceMessage, setShopMaintenanceMessage] = useState<string>(SHOP_MAINTENANCE_MESSAGE);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [coinHistory, setCoinHistory] = useState<CoinHistoryItem[]>([]);
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const lastShopSig = useRef('');

  // Dialog State
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [selectedBadgeToBuy, setSelectedBadgeToBuy] = useState<BadgeConfig | null>(null);
  const [wibukuName, setWibukuName] = useState<string>('');
  const [wibukuId, setWibukuId] = useState<string>('');
  const [dialogMode, setDialogMode] = useState<'none' | 'insufficient' | 'confirm_premium' | 'confirm_badge' | 'alert' | 'success_badge' | 'success_order_manual'>('none');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [shopSettings, setShopSettings] = useState<Record<string, string>>({});
  const [latestCreatedOrder, setLatestCreatedOrder] = useState<ShopOrder | null>(null);

  // Poll shop & badge data from D1 Database
  const loadShopData = async () => {
    try {
      const [prods, ords, cHist, userBadgesRes, shopSettingsRes] = await Promise.all([
        D1DatabaseService.getShopProducts(),
        D1DatabaseService.getShopOrders(profile?.id),
        D1DatabaseService.getCoinHistory(profile?.id),
        D1DatabaseService.getUserBadges(profile?.id || '#1'),
        D1DatabaseService.getShopSettings(),
      ]);

      const nextProducts = (prods && prods.length > 0
        ? prods.filter((p) => p.is_active === 1).sort((a, b) => a.sort_order - b.sort_order)
        : [
            { id: 'prod_1', name: 'Premium Wibuku 1 Hari', description: 'Akses Fitur Premium Wibuku selama 1 Hari', duration: '1 Hari', coins: 275000, stock: 100, is_active: 1, sort_order: 1 },
            { id: 'prod_2', name: 'Premium Wibuku 3 hari', description: 'Akses Fitur Premium Wibuku Selama 3 Hari', duration: '3 Hari', coins: 775000, stock: 5, is_active: 1, sort_order: 2 },
            { id: 'prod_3', name: 'Premium Wibuku 7 Hari', description: 'Akses Fitur Premium Wibuku selama 7 Hari', duration: '7 Hari', coins: 2750000, stock: 1, is_active: 1, sort_order: 3 },
            { id: 'prod_4', name: 'Premium Wibuku 30 Hari', description: 'Akses Fitur Premium Wibuku selama 30 Hari VIP', duration: '30 Hari', coins: 15750000, stock: 1, is_active: 1, sort_order: 4 },
          ]) as ShopProduct[];
      const nextOrders = ords || [];
      const nextHistory = cHist || [];
      if (shopSettingsRes) {
        setShopSettings(shopSettingsRes);
      }
      const nextOwned = new Set<string>();
      if (userBadgesRes && userBadgesRes.ownedBadges) {
        userBadgesRes.ownedBadges.forEach((b) => nextOwned.add(b.badge_id));
      }

      const sig = JSON.stringify({
        products: nextProducts.map((p) => ({ id: p.id, stock: p.stock, is_active: p.is_active, updated_at: p.updated_at })),
        orders: nextOrders.map((o) => ({ id: o.id, status: o.status, updated_at: o.updated_at })),
        history: nextHistory.map((h) => ({ id: h.id, timestamp: h.timestamp })),
        badges: Array.from(nextOwned.values()).sort(),
      });

      if (sig !== lastShopSig.current) {
        lastShopSig.current = sig;
        setProducts(nextProducts);
        setOrders(nextOrders);
        setCoinHistory(nextHistory);
        setOwnedBadgeIds(nextOwned);
      }
    } catch (err) {
      console.error('[SHOP DATA LOAD ERROR]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShopData();
    const interval = setInterval(loadShopData, 1000);

    const unsubProds = RealtimeService.subscribe('shop_product_updated', loadShopData);
    const unsubOrds = RealtimeService.subscribe('shop_order_updated', loadShopData);
    const unsubBadges = RealtimeService.subscribe('user_badge_updated', loadShopData);

    return () => {
      clearInterval(interval);
      unsubProds();
      unsubOrds();
      unsubBadges();
    };
  }, [profile?.id]);


  useEffect(() => {
    const applySettings = (settings?: Partial<any> | null) => {
      const enabled =
        typeof settings?.shopMaintenanceEnabled === 'boolean'
          ? settings.shopMaintenanceEnabled
          : SHOP_MAINTENANCE_MANUAL_OVERRIDE;
      const message =
        typeof settings?.shopMaintenanceMessage === 'string' && settings.shopMaintenanceMessage.trim()
          ? settings.shopMaintenanceMessage
          : SHOP_MAINTENANCE_MESSAGE;

      setShopMaintenanceEnabled(enabled);
      setShopMaintenanceMessage(message);
    };

    applySettings(SettingsService.getSettingsSync());
    SettingsService.getSettings().then(applySettings).catch(() => applySettings(null));

    const unsubscribe = SettingsService.onSettingsUpdate(applySettings);
    return unsubscribe;
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadShopData();
  };

  const isShopMaintenanceBlocked = shopMaintenanceEnabled && !isDeveloper;

  // Buy Premium Product
  const handleSelectProduct = (product: ShopProduct) => {
    if (isShopMaintenanceBlocked) {
      setAlertMessage(shopMaintenanceMessage);
      setDialogMode('alert');
      return;
    }

    if (product.stock <= 0) {
      setAlertMessage('Stok produk ini sedang habis.');
      setDialogMode('alert');
      return;
    }

    const userCoins = profile?.coins || 0;
    if (userCoins < product.coins) {
      setDialogMode('insufficient');
      return;
    }

    setSelectedProduct(product);
    setWibukuName(profile?.username || '');
    setWibukuId(profile?.id || '');
    setDialogMode('confirm_premium');
  };

  const handleConfirmOrder = async () => {
    if (!selectedProduct) return;

    if (!wibukuName.trim() || !wibukuId.trim()) {
      setAlertMessage('Nama Wibuku dan ID Wibuku tidak boleh kosong.');
      setDialogMode('alert');
      return;
    }

    setSubmitting(true);
    try {
      const res = await D1DatabaseService.createShopOrder({
        user_id: profile?.id || '#1',
        user_name: profile?.username || 'Trainer Sensei',
        wibuku_name: wibukuName.trim(),
        wibuku_id: wibukuId.trim(),
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        duration: selectedProduct.duration,
        product_coins: selectedProduct.coins,
        user_coins: profile?.coins || 0,
      });

      if (res.success) {
        if (typeof res.newCoins === 'number') {
          updateCoins(res.newCoins);
        }
        setLatestCreatedOrder(res.result || null);
        const isManualModeOn = (shopSettings.shop_manual_mode_enabled || 'true') === 'true';
        if (isManualModeOn) {
          setDialogMode('success_order_manual');
        } else {
          setDialogMode('none');
          setSelectedProduct(null);
          setActiveTab('riwayat');
          setHistorySubTab('orders');
        }
        loadShopData();
      } else {
        setAlertMessage(res.message || 'Gagal membuat pesanan penarikan.');
        setDialogMode('alert');
      }
    } catch (err: any) {
      setAlertMessage(err.message || 'Terjadi kesalahan saat memproses pesanan.');
      setDialogMode('alert');
    } finally {
      setSubmitting(false);
    }
  };

  // Buy Badge
  const handleSelectBadgeToBuy = (badge: BadgeConfig) => {
    if (isShopMaintenanceBlocked) {
      setAlertMessage(shopMaintenanceMessage);
      setDialogMode('alert');
      return;
    }

    if (ownedBadgeIds.has(badge.id)) {
      setAlertMessage('Anda sudah memiliki badge ini! Cek di menu Profil > Badge Collection.');
      setDialogMode('alert');
      return;
    }

    const userCoins = profile?.coins || 0;
    if (userCoins < badge.price) {
      setDialogMode('insufficient');
      return;
    }

    setSelectedBadgeToBuy(badge);
    setDialogMode('confirm_badge');
  };

  const handleConfirmBuyBadge = async () => {
    if (!selectedBadgeToBuy) return;

    setSubmitting(true);
    try {
      const res = await D1DatabaseService.buyBadge(
        profile?.id || '#1',
        selectedBadgeToBuy.id,
        selectedBadgeToBuy.price,
        profile?.coins || 0,
        profile?.username || 'Trainer Sensei'
      );
      if (res.success) {
        if (typeof res.newCoins === 'number') {
          updateCoins(res.newCoins);
        }
        setDialogMode('success_badge');
        loadShopData();
      } else {
        setAlertMessage(res.message || 'Gagal membeli badge.');
        setDialogMode('alert');
      }
    } catch (err: any) {
      setAlertMessage(err.message || 'Terjadi kesalahan saat membeli badge.');
      setDialogMode('alert');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Processing':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1.5 flex-shrink-0"></span>
            <span>Processing</span>
          </span>
        );
      case 'Success':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400 flex-shrink-0" />
            <span>Success</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400 flex-shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1.5 flex-shrink-0"></span>
            <span>Pending</span>
          </span>
        );
    }
  };

  // Filter badges for Badge Shop
  const displayedBadges = ALL_BADGES.filter((b) => {
    if (selectedRarityFilter === 'All') return true;
    return b.rarity === selectedRarityFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border border-amber-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Shop & Toko Tracen</h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  D1 Realtime
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Beli Badge Koleksi & Tukarkan Carrot Coin Anda dengan Akses Premium Wibuku!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-auto">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300 font-extrabold text-sm shadow-md">
              <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{(profile?.coins || 0).toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-amber-400/80 font-normal">Coins</span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {shopMaintenanceEnabled && (
          <div className={`mt-4 rounded-2xl border p-4 shadow-lg ${
            isDeveloper
              ? 'bg-amber-950/40 border-amber-500/30'
              : 'bg-rose-950/40 border-rose-500/30'
          }`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                <AlertCircle className={`w-4 h-4 ${isDeveloper ? 'text-amber-300' : 'text-rose-300'}`} />
                <span className={isDeveloper ? 'text-amber-200' : 'text-rose-200'}>Maintenance Mode</span>
              </div>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {shopMaintenanceMessage}
              </p>
              {isDeveloper && (
                <p className="text-[11px] font-bold text-amber-300/90">
                  {SHOP_MAINTENANCE_DEV_NOTE}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Primary Shop Navigation Tabs: Premium, Badge, Riwayat */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('premium')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'premium'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold scale-105'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Premium</span>
          </button>

          <button
            onClick={() => setActiveTab('badge')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'badge'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold scale-105'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Badge Shop</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold scale-105'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat</span>
            {orders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: PREMIUM */}
      {activeTab === 'premium' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pilihan Paket Premium Wibuku
            </h3>
            <span className="text-xs text-slate-500">
              *Tukarkan koin sesuai ketersediaan stok
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">Memuat katalog produk D1...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const userCoins = profile?.coins || 0;
                const canAfford = userCoins >= product.coins;

                return (
                  <div
                    key={product.id}
                    className={`relative overflow-hidden rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
                        : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {product.duration || 'Premium'}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {isOutOfStock ? 'Stok Habis' : `Stok: ${product.stock}`}
                      </span>
                    </div>

                    <div className="space-y-2 my-2">
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                        {product.description || 'Akses penuh seluruh fitur eksklusif Premium Wibuku.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Harga:</span>
                        <div className="flex items-center space-x-1 text-amber-300 font-black text-sm">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span>{product.coins.toLocaleString('id-ID')}</span>
                          <span className="text-[10px] font-normal text-amber-400/80">Coins</span>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => handleSelectProduct(product)}
                          disabled={isOutOfStock || isShopMaintenanceBlocked}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                            isOutOfStock || isShopMaintenanceBlocked
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : !canAfford
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 font-extrabold shadow-md shadow-amber-500/20'
                          }`}
                        >
                          <span>{isShopMaintenanceBlocked ? 'Maintenance' : isOutOfStock ? 'Stok Habis' : 'Tukar Premium'}</span>
                          {!isShopMaintenanceBlocked && !isOutOfStock && <ChevronRight className="w-4 h-4" />}
                        </button>

                        {isShopMaintenanceBlocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/90 border border-amber-500/40 backdrop-blur-[1px] pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                              Maintenance
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BADGE SHOP */}
      {activeTab === 'badge' && (
        <div className="space-y-6">
          {/* Filter Sub-nav */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
            {(['All', 'Common', 'Rare', 'Epic', 'Legendary'] as const).map((rarity) => (
              <button
                key={rarity}
                onClick={() => setSelectedRarityFilter(rarity)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRarityFilter === rarity
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'
                }`}
              >
                {rarity === 'All' ? 'Semua Badge' : `${rarity}`}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedBadges.map((badge) => {
              const isOwned = ownedBadgeIds.has(badge.id);
              const userCoins = profile?.coins || 0;
              const canAfford = userCoins >= badge.price;

              return (
                <div
                  key={badge.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                    isOwned
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40 hover:shadow-lg'
                  }`}
                >
                  {/* Badge Preview */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 relative min-h-[90px]">
                    <DeveloperBadge badgeId={badge.id} showRarity={true} size="md" />
                    {isOwned && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Dimiliki
                      </span>
                    )}
                  </div>

                  {/* Badge Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-white">{badge.name}</h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${badge.rarityBadgeClass}`}>
                        {badge.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[32px]">
                      {badge.description}
                    </p>
                  </div>

                  {/* Price & Buy Button */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-1.5 text-amber-300 font-extrabold text-xs">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>{badge.price.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-amber-400/80 font-normal">Coins</span>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => handleSelectBadgeToBuy(badge)}
                        disabled={isOwned || isShopMaintenanceBlocked}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isOwned || isShopMaintenanceBlocked
                            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default'
                            : canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-amber-300/80 border border-amber-500/30 hover:bg-slate-700'
                        }`}
                      >
                        {isShopMaintenanceBlocked ? 'Maintenance' : isOwned ? 'Telah Dimiliki' : 'Beli Badge'}
                      </button>

                      {isShopMaintenanceBlocked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/90 border border-amber-500/40 backdrop-blur-[1px] pointer-events-none">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                            Maintenance
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              onClick={() => setHistorySubTab('orders')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                historySubTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Riwayat Penarikan
            </button>
            <button
              onClick={() => setHistorySubTab('coins')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                historySubTab === 'coins'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Riwayat Coin
            </button>
          </div>

          {historySubTab === 'orders' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Daftar Riwayat Penarikan Premium
                </h3>
                <span className="text-xs text-slate-400">Total: {orders.length} Pesanan</span>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Belum ada riwayat penarikan premium.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">Nama Wibuku</th>
                        <th className="px-4 py-3">ID Wibuku</th>
                        <th className="px-4 py-3">Coin</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white">
                            <div>{order.product_name}</div>
                            <div className="text-[10px] text-amber-400/80 font-normal">{order.duration}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-semibold">{order.wibuku_name}</td>
                          <td className="px-4 py-3.5 text-sky-400 font-mono text-[11px]">{order.wibuku_id}</td>
                          <td className="px-4 py-3.5 text-amber-300 font-extrabold">
                            {order.coins.toLocaleString('id-ID')} Coins
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                            {new Date(order.timestamp).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              {renderStatusBadge(order.status)}
                              {(shopSettings.shop_manual_mode_enabled || 'true') === 'true' && order.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    const text = `Halo Admin Tracen, saya ingin konfirmasi pesanan Premium Wibuku:\n• Nama Wibuku: ${order.wibuku_name}\n• ID Wibuku: ${order.wibuku_id}\n• Produk: ${order.product_name} (${order.duration})\n• Harga: ${order.coins.toLocaleString('id-ID')} Carrot Coins\n• ID Pesanan: ${order.id}`;
                                    window.open(`https://wa.me/6281563808289?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                                  title="Proses Cepat via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                                  <span>Proses Cepat (WA)</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {historySubTab === 'coins' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Riwayat Mutasi Carrot Coins
                </h3>
                <span className="text-xs text-slate-400">Log Transaksi</span>
              </div>

              {coinHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Belum ada riwayat transaksi coin.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Transaksi</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Jumlah</th>
                        <th className="px-4 py-3">Saldo Akhir</th>
                        <th className="px-4 py-3 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {coinHistory.map((item) => {
                        const isPositive = item.amount >= 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">
                              <div>{item.title}</div>
                              {item.detail && <div className="text-[10px] text-slate-400">{item.detail}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                {item.type}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 font-extrabold ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? `+${item.amount.toLocaleString('id-ID')}` : item.amount.toLocaleString('id-ID')} Coins
                            </td>
                            <td className="px-4 py-3 text-amber-300 font-bold">
                              {item.balance_after.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FLOATING DIALOG 1: INSUFFICIENT COIN */}
      {dialogMode === 'insufficient' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Carrot Coin tidak mencukupi.</h3>
              <p className="text-xs text-slate-400">
                Selesaikan Tebak Kata atau tantangan Live Duel untuk mendapatkan lebih banyak Carrot Coins!
              </p>
            </div>

            <button
              onClick={() => setDialogMode('none')}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG 2: CONFIRM PREMIUM MODAL */}
      {dialogMode === 'confirm_premium' && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Konfirmasi Penarikan Premium</h3>
                <p className="text-xs text-slate-400">{selectedProduct.name}</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Paket Premium:</span>
                <span className="text-white font-bold">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Durasi:</span>
                <span className="text-amber-400 font-bold">{selectedProduct.duration}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Biaya Coin:</span>
                <span className="text-amber-300 font-black">{selectedProduct.coins.toLocaleString('id-ID')} Coins</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Nama Wibuku
                </label>
                <input
                  type="text"
                  value={wibukuName}
                  onChange={(e) => setWibukuName(e.target.value)}
                  placeholder="Masukkan Nama Wibuku Anda..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  ID Wibuku
                </label>
                <input
                  type="text"
                  value={wibukuId}
                  onChange={(e) => setWibukuId(e.target.value)}
                  placeholder="Masukkan ID Wibuku Anda..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDialogMode('none')}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Konfirmasi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG 3: CONFIRM BADGE BUY */}
      {dialogMode === 'confirm_badge' && selectedBadgeToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Award className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">Beli Badge Koleksi</h3>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-center">
                <DeveloperBadge badgeId={selectedBadgeToBuy.id} showRarity={true} size="md" />
              </div>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin membeli badge <strong className="text-white">{selectedBadgeToBuy.name}</strong> seharga{' '}
                <strong className="text-amber-300">{selectedBadgeToBuy.price.toLocaleString('id-ID')} Coins</strong>?
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDialogMode('none')}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmBuyBadge}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Beli Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG 4: SUCCESS BADGE BUY */}
      {dialogMode === 'success_badge' && selectedBadgeToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">Pembelian Badge Berhasil!</h3>
              <p className="text-xs text-slate-400">
                Badge <strong className="text-amber-300">{selectedBadgeToBuy.name}</strong> telah ditambahkan ke koleksi Anda! Anda dapat memasangnya melalui menu <strong className="text-white">Profil &gt; Badge Collection</strong>.
              </p>
            </div>

            <button
              onClick={() => setDialogMode('none')}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Mantap!
            </button>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG 4.5: SUCCESS ORDER MANUAL (WA FALLBACK) */}
      {dialogMode === 'success_order_manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">Pesanan Premium Berhasil Dibuat!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pesanan Anda telah tercatat. Anda dapat menggunakan tombol <strong className="text-emerald-400">Proses Cepat via WhatsApp</strong> di bawah untuk mengonfirmasi pesanan ke Admin secara langsung.
              </p>
              {latestCreatedOrder && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1 my-2">
                  <div className="text-slate-400">Pesanan: <span className="text-white font-bold">{latestCreatedOrder.product_name} ({latestCreatedOrder.duration})</span></div>
                  <div className="text-slate-400">Nama Wibuku: <span className="text-amber-300 font-bold">{latestCreatedOrder.wibuku_name}</span></div>
                  <div className="text-slate-400">ID Wibuku: <span className="text-sky-400 font-mono font-bold">{latestCreatedOrder.wibuku_id}</span></div>
                  <div className="text-slate-400">Total Coin: <span className="text-amber-400 font-extrabold">{latestCreatedOrder.coins.toLocaleString('id-ID')} Coins</span></div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const text = `Halo Admin Tracen, saya ingin konfirmasi pesanan Premium Wibuku:\n• Nama Wibuku: ${latestCreatedOrder?.wibuku_name || wibukuName}\n• ID Wibuku: ${latestCreatedOrder?.wibuku_id || wibukuId}\n• Produk: ${latestCreatedOrder?.product_name || selectedProduct?.name || 'Premium Wibuku'}\n• Harga: ${(latestCreatedOrder?.coins || selectedProduct?.coins || 0).toLocaleString('id-ID')} Carrot Coins\n• ID Pesanan: ${latestCreatedOrder?.id || ''}`;
                  window.open(`https://wa.me/6281563808289?text=${encodeURIComponent(text)}`, '_blank');
                  setDialogMode('none');
                  setSelectedProduct(null);
                  setActiveTab('riwayat');
                  setHistorySubTab('orders');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Proses Cepat via WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setDialogMode('none');
                  setSelectedProduct(null);
                  setActiveTab('riwayat');
                  setHistorySubTab('orders');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer border border-slate-700"
              >
                Selesai & Lihat Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG 5: ALERT */}
      {dialogMode === 'alert' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Informasi</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{alertMessage}</p>
            </div>

            <button
              onClick={() => setDialogMode('none')}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer border border-slate-700"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
