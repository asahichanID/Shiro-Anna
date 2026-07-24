import React, { useState } from 'react';
import { Search, Music, Video, Play, Loader2, AlertCircle, RefreshCw, Volume2, Sparkles, Download, Film, Radio, ArrowLeft } from 'lucide-react';
import { ActivityService } from '../services/ActivityService';

interface SearchResultItem {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  publishTime?: string;
  description?: string;
}

interface MediaState {
  type: 'audio' | 'video';
  item: SearchResultItem;
  downloadUrl: string;
  title: string;
  thumbnail: string;
  duration?: string;
  quality?: string;
}

export const MusicPlayViewer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Loading & Active Media State
  const [loadingMedia, setLoadingMedia] = useState<{
    type: 'audio' | 'video';
    item: SearchResultItem;
  } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaState | null>(null);

  // Quick preset suggestions
  const presetQueries = [
    'Umapyoi Densetsu',
    'GIRLS LEGEND U',
    'Oguri Cap Theme',
    'Kaikai Kitan',
    'Yoasobi Idol',
    'Blue Bird Naruto',
  ];

  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const searchQuery = (searchOverride || query).trim();
    if (!searchQuery) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSearchResults([]);

    try {
      let data: any = null;

      // 1. Try server proxy endpoint first
      try {
        const res = await fetch(`/api/naze-search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e1) {
        console.warn('Server proxy search failed, trying direct/corsproxy...');
      }

      // 2. Direct fetch fallback
      if (!data) {
        const directEndpoint = `https://api.naze.biz.id/search/youtube?query=${encodeURIComponent(
          searchQuery
        )}&apikey=nz-880c23d4fd`;
        try {
          const res = await fetch(directEndpoint);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e2) {
          console.warn('Direct search fetch failed, trying corsproxy...');
        }
      }

      // 3. Corsproxy fallback
      if (!data) {
        const directEndpoint = `https://api.naze.biz.id/search/youtube?query=${encodeURIComponent(
          searchQuery
        )}&apikey=nz-880c23d4fd`;
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(directEndpoint)}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e3) {
          console.warn('Corsproxy failed...');
        }
      }

      // Extract raw items array safely
      let rawItems: any[] = [];
      if (Array.isArray(data?.result?.items)) {
        rawItems = data.result.items;
      } else if (Array.isArray(data?.result)) {
        rawItems = data.result;
      } else if (Array.isArray(data?.items)) {
        rawItems = data.items;
      } else if (Array.isArray(data)) {
        rawItems = data;
      }

      if (!rawItems || rawItems.length === 0) {
        throw new Error(`Pencarian untuk "${searchQuery}" tidak mengembalikan hasil dari API.`);
      }

      const formatted: SearchResultItem[] = rawItems.slice(0, 25).map((item: any) => {
        const videoId =
          item.id?.videoId ||
          (typeof item.id === 'string' ? item.id : '') ||
          item.videoId ||
          '';

        const title = item.snippet?.title || item.title || 'Unknown Title';
        const channel =
          item.snippet?.channelTitle || item.channel || item.author?.name || 'YouTube Channel';
        const publishTime = item.snippet?.publishTime || item.publishTime || item.ago || '';
        const description = item.snippet?.description || item.description || '';

        // Thumbnail strictly from snippet.thumbnails.high.url (or medium / default)
        const thumbnail =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          item.thumbnail ||
          '';

        return {
          videoId,
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          title,
          channel,
          thumbnail,
          publishTime,
          description,
        };
      });

      setSearchResults(formatted);
    } catch (err: any) {
      console.error('Search API error:', err);
      setSearchError(err.message || 'Gagal mengambil data pencarian dari API. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchMedia = async (item: SearchResultItem, type: 'audio' | 'video') => {
    setLoadingMedia({ type, item });
    setMediaError(null);
    setActiveMedia(null);

    // Format: 'mp3' for Audio, '720' for Video (strictly '720', NOT '720p')
    const format = type === 'audio' ? 'mp3' : '720';
    const youtubeUrl = `https://www.youtube.com/watch?v=${item.videoId}`;

    try {
      let data: any = null;

      // 1. Try server proxy endpoint first
      try {
        const res = await fetch(
          `/api/naze-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`
        );
        if (res.ok) {
          data = await res.json();
        }
      } catch (e1) {
        console.warn('Server proxy download failed, trying direct fetch...');
      }

      // 2. Direct fetch fallback
      if (!data) {
        const directEndpoint = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(
          youtubeUrl
        )}&format=${format}&apikey=nz-880c23d4fd`;
        try {
          const res = await fetch(directEndpoint);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e2) {
          console.warn('Direct download fetch failed, trying corsproxy...');
        }
      }

      // 3. Corsproxy fallback
      if (!data) {
        const directEndpoint = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(
          youtubeUrl
        )}&format=${format}&apikey=nz-880c23d4fd`;
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(directEndpoint)}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e3) {
          console.warn('Corsproxy failed...');
        }
      }

      if (!data || !data.result) {
        throw new Error(`Respon API tidak memberikan data download untuk media ${type}.`);
      }

      const resObj = data.result;
      const downloadUrl = resObj.download || resObj.url || resObj.link || '';

      if (!downloadUrl) {
        throw new Error(`API tidak mengembalikan link download ${type} yang valid.`);
      }

      setActiveMedia({
        type,
        item,
        downloadUrl,
        title: resObj.title || item.title,
        thumbnail: resObj.thumbnail || item.thumbnail,
        duration: resObj.duration || '',
        quality: resObj.quality || '',
      });

      ActivityService.logActivity(
        'music_play',
        'Memutar Lagu / Video',
        `Memutar ${type === 'audio' ? 'Audio' : 'Video'}: "${resObj.title || item.title}"`
      );
    } catch (err: any) {
      console.error('Media download error:', err);
      setMediaError(err.message || `Gagal memuat media ${type} dari API. Silakan coba lagi.`);
    } finally {
      setLoadingMedia(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900/80 via-indigo-900/80 to-purple-950/80 p-6 border border-sky-500/30 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/30 flex-shrink-0 flex items-center justify-center">
              <Radio className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black bg-gradient-to-r from-sky-300 via-indigo-200 to-white bg-clip-text text-transparent">
                  🎵 Oguri Cap Jukebox & Player
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30">
                  YouTube Powered
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Cari dan putar lagu atau video kesukaanmu bersama Oguri Cap di Tracen Academy! 🐎
              </p>
            </div>
          </div>

          {/* Quick Stats or Quote */}
          <div className="hidden lg:flex items-center space-x-3 bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 italic">
              "Musik memberikan energi ekstra saat latihan lari pagi!"
            </span>
          </div>
        </div>
      </div>

      {/* Active Player Card View (If media is ready or loading) */}
      {loadingMedia && (
        <div className="bg-slate-900/90 border border-sky-500/50 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center space-y-4 animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-purple-500/5 animate-pulse"></div>
          <div className="relative z-10 max-w-md mx-auto space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 p-1 animate-spin">
                <div className="w-full h-full bg-slate-950 rounded-full"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl animate-bounce">🐴</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-sky-300">
                🐴 Oguri Cap sedang menyiapkan {loadingMedia.type === 'audio' ? 'Audio 🎧' : 'Video 720p 🎥'}...
              </h3>
              <p className="text-xs text-slate-400 mt-1">Mohon tunggu sebentar, sedang diunduh dari YouTube...</p>
            </div>

            {/* Target Media Preview */}
            <div className="flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-left">
              {loadingMedia.item.thumbnail && (
                <img
                  src={loadingMedia.item.thumbnail}
                  alt={loadingMedia.item.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{loadingMedia.item.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{loadingMedia.item.channel}</p>
              </div>
            </div>

            {/* Equalizer animation preview */}
            <div className="flex justify-center items-end space-x-1 h-6 pt-2">
              <span className="w-1 bg-sky-400 h-2 animate-bounce rounded-full"></span>
              <span className="w-1 bg-indigo-400 h-5 animate-bounce delay-100 rounded-full"></span>
              <span className="w-1 bg-purple-400 h-3 animate-bounce delay-200 rounded-full"></span>
              <span className="w-1 bg-sky-400 h-6 animate-bounce delay-300 rounded-full"></span>
              <span className="w-1 bg-amber-400 h-4 animate-bounce delay-150 rounded-full"></span>
            </div>
          </div>
        </div>
      )}

      {/* Media Download/Fetch Error Box */}
      {mediaError && !loadingMedia && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-6 shadow-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-sm font-bold text-red-300">Gagal Menyiapkan Media</h3>
          <p className="text-xs text-red-200/80 max-w-lg mx-auto">{mediaError}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => mediaError && activeMedia && handleFetchMedia(activeMedia.item, activeMedia.type)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi (Retry)</span>
            </button>
            <button
              onClick={() => setMediaError(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Active Audio / Video Player Box */}
      {activeMedia && !loadingMedia && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all transform scale-100 hover:border-sky-500/60">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveMedia(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                {activeMedia.type === 'audio' ? <Volume2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                {activeMedia.type === 'audio' ? 'Audio Player Ready' : 'Video Player Ready'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                Siap Diputar
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Thumbnail & Info */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 md:col-span-1">
              {(activeMedia.thumbnail || activeMedia.item.thumbnail) ? (
                <img
                  src={activeMedia.thumbnail || activeMedia.item.thumbnail}
                  alt={activeMedia.title || activeMedia.item.title}
                  className="w-28 h-28 rounded-xl object-cover shadow-lg border border-slate-700 flex-shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Music className="w-8 h-8" />
                </div>
              )}
              <div className="space-y-1 text-center sm:text-left overflow-hidden">
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                  {activeMedia.title || activeMedia.item.title}
                </h3>
                <p className="text-xs text-sky-300 font-medium truncate">
                  {activeMedia.item.channel}
                </p>
                {(activeMedia.duration || activeMedia.item.duration) && (
                  <p className="text-[11px] text-slate-400">
                    ⏱️ Durasi: {activeMedia.duration || activeMedia.item.duration}
                  </p>
                )}
                {activeMedia.quality && (
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    Kualitas: {activeMedia.quality}
                  </p>
                )}
              </div>
            </div>

            {/* Media Player Column */}
            <div className="md:col-span-2 space-y-3">
              {activeMedia.type === 'audio' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 shadow-inner">
                  {/* Visual Equalizer Light Animation */}
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      HTML5 Audio Source
                    </span>
                    <div className="flex items-end space-x-1 h-4">
                      <span className="w-1 bg-sky-400 h-2 animate-pulse rounded-full"></span>
                      <span className="w-1 bg-indigo-400 h-4 animate-pulse delay-75 rounded-full"></span>
                      <span className="w-1 bg-purple-400 h-3 animate-pulse delay-150 rounded-full"></span>
                      <span className="w-1 bg-sky-400 h-4 animate-pulse delay-100 rounded-full"></span>
                      <span className="w-1 bg-amber-400 h-2 animate-pulse delay-200 rounded-full"></span>
                    </div>
                  </div>

                  <audio
                    controls
                    autoPlay
                    src={activeMedia.downloadUrl}
                    className="w-full accent-sky-500"
                  >
                    Browser Anda tidak mendukung elemen audio.
                  </audio>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="text-emerald-400">✓ MP3 Audio</span>
                    <a
                      href={activeMedia.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => ActivityService.logActivity('download_audio', 'Download Audio', `Mengunduh berkas audio MP3: "${activeMedia.title}"`)}
                      className="text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh MP3
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
                    <video
                      controls
                      autoPlay
                      src={activeMedia.downloadUrl}
                      className="w-full max-h-80 object-contain"
                    >
                      Browser Anda tidak mendukung elemen video.
                    </video>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      Video 720 Format
                    </span>
                    <a
                      href={activeMedia.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Video</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik judul lagu, anime OST, atau penyanyi..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-600/20 flex items-center justify-center space-x-2 transition-all flex-shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mencari...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Cari Lagu</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Presets */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium flex-shrink-0">Rekomendasi:</span>
          {presetQueries.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setQuery(preset);
                handleSearch(undefined, preset);
              }}
              className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition-all flex-shrink-0 text-[11px]"
            >
              🎵 {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Grid / List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Music className="w-4 h-4 text-sky-400" />
            <span>Hasil Pencarian YouTube</span>
            {searchResults.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-normal">
                {searchResults.length} Hasil
              </span>
            )}
          </h3>
        </div>

        {/* Error message for search */}
        {searchError && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 text-center space-y-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
            <p className="text-xs text-red-300">{searchError}</p>
            <button
              onClick={() => handleSearch()}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Skeleton Loading state */}
        {isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex space-x-3 animate-pulse"
              >
                <div className="w-24 h-24 bg-slate-800 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/40 rounded w-1/3"></div>
                  <div className="flex space-x-2 pt-2">
                    <div className="h-7 bg-slate-800 rounded-lg w-20"></div>
                    <div className="h-7 bg-slate-800 rounded-lg w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Display */}
        {!isSearching && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition-all hover:shadow-lg flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3.5 group"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Music className="w-8 h-8" />
                    </div>
                  )}
                  {item.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                      {item.duration}
                    </span>
                  )}
                </div>

                {/* Info & Action Buttons */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-sky-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                      {item.channel}
                    </p>
                  </div>

                  {/* Modern Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleFetchMedia(item, 'audio')}
                      className="flex-1 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-500 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>🎧 Audio</span>
                    </button>

                    <button
                      onClick={() => handleFetchMedia(item, 'video')}
                      className="flex-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>🎥 Video</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initial Empty state before search */}
        {!isSearching && hasSearched && searchResults.length === 0 && !searchError && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
            <Music className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs">Tidak ada hasil ditemukan. Coba ketik kata kunci lain di atas.</p>
          </div>
        )}

        {!hasSearched && !isSearching && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-sky-400">
              <Play className="w-6 h-6 ml-0.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Siap Mencari Musik</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ketik nama lagu favoritmu di kolom pencarian atau pilih tombol rekomendasi di atas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
