import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Save,
  Coins,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { ShopOrder, ShopProduct, ShopStats } from '../types';
import { RealtimeService } from '../services/SupabaseService';

export const DeveloperShopManager: React.FC = () => {
  const [subTab, setSubTab] = useState<'orders' | 'products' | 'settings'>('orders');

  // Realtime Data State
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [shopConfig, setShopConfig] = useState<Record<string, string>>({
    shop_global_max_daily: '100',
    shop_user_max_daily: '1',
    shop_daily_limit_msg: 'Batas penarikan harian telah tercapai. Silakan coba lagi besok.',
    shop_out_of_stock_msg: 'Stok produk ini sedang habis. Silakan tunggu refill stok.',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const lastDataSig = useRef('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Product Modal / Form State
  const [editingProduct, setEditingProduct] = useState<Partial<ShopProduct> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState<boolean>(false);

  // Load Realtime Data from D1
  const fetchAllData = async () => {
    try {
      const [ords, prods, st, cfg] = await Promise.all([
        D1DatabaseService.getShopOrders(),
        D1DatabaseService.getShopProducts(),
        D1DatabaseService.getShopStats(),
        D1DatabaseService.getShopSettings(),
      ]);

      const nextOrders = ords || [];
      const nextProducts = prods || [];
      const nextStats = st || null;
      const nextConfig = cfg && Object.keys(cfg).length > 0 ? { ...shopConfig, ...cfg } : shopConfig;
      const sig = JSON.stringify({
        orders: nextOrders.map((o) => ({ id: o.id, status: o.status, updated_at: o.updated_at })),
        products: nextProducts.map((p) => ({ id: p.id, stock: p.stock, is_active: p.is_active, updated_at: p.updated_at })),
        stats: nextStats,
        config: nextConfig,
      });

      if (sig !== lastDataSig.current) {
        lastDataSig.current = sig;
        setOrders(nextOrders);
        setProducts(nextProducts);
        setStats(nextStats);
        if (cfg && Object.keys(cfg).length > 0) {
          setShopConfig((prev) => ({ ...prev, ...cfg }));
        }
      }
    } catch (err) {
      console.error('[DEV SHOP MANAGER FETCH ERROR]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 1000);

    const unsubProds = RealtimeService.subscribe('shop_product_updated', fetchAllData);
    const unsubOrds = RealtimeService.subscribe('shop_order_updated', fetchAllData);
    const unsubSettings = RealtimeService.subscribe('shop_settings_updated', fetchAllData);

    return () => {
      clearInterval(interval);
      unsubProds();
      unsubOrds();
      unsubSettings();
    };
  }, []);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Change order status (Processing, Success, Reject)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'Processing' | 'Success' | 'Rejected') => {
    try {
      const updated = await D1DatabaseService.updateShopOrderStatus(
        orderId,
        newStatus,
        newStatus === 'Rejected' ? 'Pesanan ditolak oleh Developer' : ''
      );

      if (updated) {
        if (newStatus === 'Rejected') {
          showToast('Pesanan ditolak. Carrot Coin telah otomatis dikembalikan ke user!');
        } else {
          showToast(`Status pesanan berhasil diubah menjadi ${newStatus}!`);
        }
        fetchAllData();
      } else {
        showToast('Gagal mengubah status pesanan.', true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi server D1.', true);
    }
  };

  // Save Shop Config
  const handleSaveConfig = async () => {
    try {
      const ok = await D1DatabaseService.updateShopSettings(shopConfig);
      if (ok) {
        showToast('Pengaturan limit & pesan Shop berhasil disimpan di D1!');
        fetchAllData();
      } else {
        showToast('Gagal menyimpan pengaturan Shop.', true);
      }
    } catch (err) {
      showToast('Error koneksi server.', true);
    }
  };

  // Open Edit Product
  const handleOpenEditProduct = (prod?: ShopProduct) => {
    if (prod) {
      setEditingProduct({ ...prod });
      setIsNewProduct(false);
    } else {
      setEditingProduct({
        id: `prod_${Date.now()}`,
        name: 'Premium Wibuku 1 Hari',
        description: 'Akses Fitur Premium Wibuku selama 1 Hari',
        duration: '1 Hari',
        coins: 50000,
        stock: 100,
        is_active: 1,
        sort_order: products.length + 1,
      });
      setIsNewProduct(true);
    }
  };

  // Save Product (Create / Update)
  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name) return;

    try {
      const saved = await D1DatabaseService.saveShopProduct(editingProduct);
      if (saved) {
        showToast(`Produk "${editingProduct.name}" berhasil disimpan di D1!`);
        setEditingProduct(null);
        fetchAllData();
      } else {
        showToast('Gagal menyimpan produk.', true);
      }
    } catch (err) {
      showToast('Error menyimpan produk.', true);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) return;

    try {
      const ok = await D1DatabaseService.deleteShopProduct(id);
      if (ok) {
        showToast(`Produk "${name}" berhasil dihapus.`);
        fetchAllData();
      } else {
        showToast('Gagal menghapus produk.', true);
      }
    } catch (err) {
      showToast('Error menghapus produk.', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3.5 text-emerald-300 text-xs font-bold flex items-center space-x-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl p-3.5 text-rose-300 text-xs font-bold flex items-center space-x-2 shadow-lg animate-fadeIn">
          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {copiedText && (
        <div className="bg-indigo-950/90 border border-indigo-500/50 rounded-xl p-2.5 text-sky-300 text-xs font-bold flex items-center space-x-2 shadow-lg animate-fadeIn fixed bottom-5 right-5 z-50">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Disalin ke Clipboard ({copiedText})</span>
        </div>
      )}

      {/* Developer Shop Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-white">Manajemen Penarikan Premium (Shop D1)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Developer Tools
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola status pesanan penarikan premium, stok produk, harga, limit harian, dan statistik realtime.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAllData}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Sync Realtime</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setSubTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
              subTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Penarikan Premium ({orders.length})</span>
          </button>

          <button
            onClick={() => setSubTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
              subTab === 'products'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Katalog Produk ({products.length})</span>
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
              subTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan Limit & Pesan</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PENARIKAN PREMIUM ORDERS & REALTIME STATS */}
      {subTab === 'orders' && (
        <div className="space-y-6">
          {/* Realtime Shop Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Hari Ini</p>
              <p className="text-base font-black text-sky-400">{stats?.totalToday || 0}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Bulan Ini</p>
              <p className="text-base font-black text-indigo-400">{stats?.totalMonth || 0}</p>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-amber-400 uppercase">Pending</p>
              <p className="text-base font-black text-amber-300">{stats?.totalPending || 0}</p>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-amber-300 uppercase">Processing</p>
              <p className="text-base font-black text-amber-400">{stats?.totalProcessing || 0}</p>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">Success</p>
              <p className="text-base font-black text-emerald-300">{stats?.totalSuccess || 0}</p>
            </div>

            <div className="bg-slate-900 border border-rose-500/30 p-3.5 rounded-xl text-center space-y-1">
              <p className="text-[10px] font-bold text-rose-400 uppercase">Reject</p>
              <p className="text-base font-black text-rose-300">{stats?.totalReject || 0}</p>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-1 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-amber-400 uppercase">Total Coin</p>
              <p className="text-xs font-black text-amber-300">
                {(stats?.totalCoinsUsed || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Daftar Permintaan Penarikan Premium</span>
              </h4>
              <span className="text-xs text-slate-400">Total: {orders.length} Order</span>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">Belum ada pesanan penarikan premium di D1.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Nama User</th>
                      <th className="px-4 py-3">Nama Wibuku</th>
                      <th className="px-4 py-3">ID Wibuku</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Lama Premium</th>
                      <th className="px-4 py-3">Coin</th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi Developer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                          {order.user_name}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-semibold whitespace-nowrap">
                          {order.wibuku_name}
                        </td>
                        <td className="px-4 py-3.5 text-sky-400 font-mono text-[11px] whitespace-nowrap">
                          {order.wibuku_id}
                        </td>
                        <td className="px-4 py-3.5 text-white font-bold whitespace-nowrap">
                          {order.product_name}
                        </td>
                        <td className="px-4 py-3.5 text-amber-400 font-extrabold whitespace-nowrap">
                          {order.duration}
                        </td>
                        <td className="px-4 py-3.5 text-amber-300 font-extrabold whitespace-nowrap">
                          {order.coins.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(order.timestamp).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {order.status === 'Processing' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1 flex-shrink-0"></span>
                              <span>Processing</span>
                            </span>
                          )}
                          {order.status === 'Success' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              <span>Success</span>
                            </span>
                          )}
                          {order.status === 'Rejected' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <XCircle className="w-3 h-3 mr-1 text-rose-400" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {order.status === 'Pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1 flex-shrink-0"></span>
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Copy Nama Wibuku */}
                            <button
                              onClick={() => handleCopy(order.wibuku_name, 'Nama Wibuku')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
                              title="Copy Nama Wibuku"
                            >
                              <Copy className="w-3 h-3 text-sky-400" />
                            </button>

                            {/* Copy ID Wibuku */}
                            <button
                              onClick={() => handleCopy(order.wibuku_id, 'ID Wibuku')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
                              title="Copy ID Wibuku"
                            >
                              <Copy className="w-3 h-3 text-indigo-400" />
                            </button>

                            {/* Processing Button */}
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Processing')}
                              disabled={order.status === 'Processing'}
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-extrabold border border-amber-500/40 transition-all cursor-pointer disabled:opacity-40"
                              title="Ubah status ke Processing"
                            >
                              Processing
                            </button>

                            {/* Success Button */}
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Success')}
                              disabled={order.status === 'Success'}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-40"
                              title="Ubah status ke Success"
                            >
                              Success
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Rejected')}
                              disabled={order.status === 'Rejected'}
                              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-extrabold border border-rose-500/40 transition-all cursor-pointer disabled:opacity-40"
                              title="Ubah status ke Rejected & Kembalikan Coin"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: KATALOG PRODUK MANAGEMENT */}
      {subTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Katalog Produk Shop D1</span>
            </h4>

            <button
              onClick={() => handleOpenEditProduct()}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Urutan: #{prod.sort_order}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        prod.is_active === 1
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {prod.is_active === 1 ? 'ACTIVE (ON)' : 'OFF'}
                    </span>
                  </div>

                  <h5 className="text-base font-extrabold text-white">{prod.name}</h5>
                  <p className="text-xs text-slate-400 mt-1">{prod.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Harga Coin:</span>
                    <span className="text-amber-300 font-extrabold">{prod.coins.toLocaleString('id-ID')} Coins</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Lama Premium:</span>
                    <span className="text-white font-bold">{prod.duration}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Stok Tersedia:</span>
                    <span className="text-emerald-400 font-bold">{prod.stock} unit</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleOpenEditProduct(prod)}
                      className="w-1/2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="w-1/2 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold transition-all border border-rose-500/30 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PENGATURAN LIMIT & PESAN SHOP */}
      {subTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Pengaturan Limit & Pesan Error Shop D1</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Seluruh perubahan disimpan di D1 SQLite dan berlaku realtime tanpa perlu refresh atau redeploy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Global Max Withdrawal Per Day */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-200">
                Maksimal Penarikan Global Per Hari
              </label>
              <input
                type="number"
                value={shopConfig.shop_global_max_daily || '100'}
                onChange={(e) => setShopConfig({ ...shopConfig, shop_global_max_daily: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* User Max Withdrawal Per Day */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-200">
                Maksimal Penarikan Per User Per Hari
              </label>
              <input
                type="number"
                value={shopConfig.shop_user_max_daily || '1'}
                onChange={(e) => setShopConfig({ ...shopConfig, shop_user_max_daily: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Daily Limit Message */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block font-bold text-slate-200">
                Pesan Limit Harian
              </label>
              <input
                type="text"
                value={shopConfig.shop_daily_limit_msg || ''}
                onChange={(e) => setShopConfig({ ...shopConfig, shop_daily_limit_msg: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Out of Stock Message */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block font-bold text-slate-200">
                Pesan Stok Habis
              </label>
              <input
                type="text"
                value={shopConfig.shop_out_of_stock_msg || ''}
                onChange={(e) => setShopConfig({ ...shopConfig, shop_out_of_stock_msg: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleSaveConfig}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Shop</span>
            </button>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-extrabold text-white">
                {isNewProduct ? 'Tambah Produk Shop Baru' : 'Edit Produk Shop'}
              </h4>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Produk</label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Contoh: Premium Wibuku 1 Hari"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Deskripsi Produk</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={2}
                  placeholder="Deskripsi singkat produk..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Lama Premium</label>
                  <input
                    type="text"
                    value={editingProduct.duration || '1 Hari'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, duration: e.target.value })}
                    placeholder="e.g. 1 Hari / 3 Hari / 7 Hari"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Harga Coin</label>
                  <input
                    type="number"
                    value={editingProduct.coins || 50000}
                    onChange={(e) => setEditingProduct({ ...editingProduct, coins: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Stok Produk</label>
                  <input
                    type="number"
                    value={editingProduct.stock || 100}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Urutan Tampilan</label>
                  <input
                    type="number"
                    value={editingProduct.sort_order || 1}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Status Ketersediaan</label>
                <select
                  value={editingProduct.is_active ?? 1}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_active: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value={1}>ACTIVE (ON)</option>
                  <option value={0}>OFF (Tutup/Nonaktif)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs shadow-md"
              >
                Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
