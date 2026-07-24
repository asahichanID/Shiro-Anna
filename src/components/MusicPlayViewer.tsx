import React, { useState } from 'react';
import {
  Search,
  Music,
  Video,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw,
  Volume2,
  Sparkles,
  Download,
  Film,
  Radio,
  ArrowLeft,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { ActivityService } from '../services/ActivityService';
import { apiClient, WORKER_BASE_URL, SearchItem } from '../api/client';

export type SearchResultItem = SearchItem;

interface MediaState {
  type: 'audio' | 'video' | 'tiktok' | 'spotify';
  item: SearchResultItem;
  downloadUrl: string;
  title: string;
  thumbnail: string;
  duration?: string;
  quality?: string;
}

export interface ApiDebugInfo {
  stepName?: string;
  requestUrl: string;
  httpStatus: number | string;
  errorMessage: string;
  responseBody: string;
  provider: string;
  apiKeyStatus: string;
}

const DebugCard: React.FC<{ debugList: ApiDebugInfo[]; title?: string }> = ({ debugList, title }) => {
  if (!debugList || debugList.length === 0) return null;

  return (
    <div className="bg-slate-950 border-2 border-sky-500/60 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 my-3 text-left font-sans animate-fadeIn">
      <div className="flex items-center justify-between pb-3 border-b border-sky-500/30">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 text-xs">
            🌐
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-sky-300">
              {title || 'Cloudflare Worker Gateway Log'}
            </h4>
            <p className="text-[10px] text-sky-200/70">
              Base URL: <code className="text-emerald-300 font-bold">{WORKER_BASE_URL}</code>
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
          WORKER ACTIVE
        </span>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {debugList.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2 font-mono text-slate-200"
          >
            {item.stepName && (
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-[11px] font-bold text-sky-400">{item.stepName}</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-400">
                  Log #{idx + 1}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Provider:
                </span>
                <span className="text-indigo-300 font-semibold">{item.provider}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Status API:
                </span>
                <span className="text-emerald-300 font-semibold">{item.apiKeyStatus}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Request URL:
                </span>
                <code className="text-sky-300 break-all bg-slate-950 px-2 py-1 rounded border border-slate-800 block mt-0.5 text-[11px]">
                  {item.requestUrl}
                </code>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  HTTP Status:
                </span>
                <span
                  className={`font-bold ${
                    String(item.httpStatus).startsWith('2')
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {item.httpStatus}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Pesan Error:
                </span>
                <span className="text-rose-300 font-semibold break-words">{item.errorMessage}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Response Body:
              </span>
              <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-amber-200/90 whitespace-pre-wrap break-all max-h-36 overflow-y-auto font-mono">
                {item.responseBody}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MusicPlayViewer: React.FC = () => {
  const [activeTabMode, setActiveTabMode] = useState<'youtube' | 'tiktok' | 'spotify'>('youtube');

  // YouTube Search & Media State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchDebugList, setSearchDebugList] = useState<ApiDebugInfo[]>([]);

  // TikTok State
  const [tiktokUrlInput, setTiktokUrlInput] = useState('');
  const [isTiktokLoading, setIsTiktokLoading] = useState(false);

  // Spotify State
  const [spotifyInput, setSpotifyInput] = useState('');
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(false);

  // Loading & Active Media State
  const [loadingMedia, setLoadingMedia] = useState<{
    type: 'audio' | 'video' | 'tiktok' | 'spotify';
    item: SearchResultItem;
  } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaState | null>(null);
  const [mediaDebugList, setMediaDebugList] = useState<ApiDebugInfo[]>([]);

  // Quick preset suggestions
  const presetQueries = [
    'Umapyoi Densetsu',
    'GIRLS LEGEND U',
    'Oguri Cap Theme',
    'Kaikai Kitan',
    'Yoasobi Idol',
    'Blue Bird Naruto',
  ];

  // Handle YouTube Search via API Client
  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const searchQuery = (searchOverride || query).trim();
    if (!searchQuery) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSearchResults([]);
    setSearchDebugList([]);

    const debugAttempts: ApiDebugInfo[] = [];

    try {
      const response = await apiClient.searchYouTube(searchQuery);

      if (!response.success || !response.result || response.result.length === 0) {
        debugAttempts.push({
          stepName: 'Worker API Request (/search)',
          requestUrl: `${WORKER_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}`,
          httpStatus: response.success ? '200 OK (Empty Result)' : 'API Error',
          errorMessage: response.message || 'Pencarian tidak mengembalikan hasil.',
          responseBody: JSON.stringify(response, null, 2),
          provider: response.provider || 'shiroapi',
          apiKeyStatus: 'Active',
        });
        setSearchDebugList(debugAttempts);
        throw new Error(response.message || `Pencarian untuk "${searchQuery}" tidak mengembalikan hasil dari Worker.`);
      }

      setSearchResults(response.result);
    } catch (err: any) {
      console.error('Search API error:', err);
      setSearchError(err.message || 'Gagal mengambil data pencarian dari Worker API. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Fetch YouTube Media via API Client
  const handleFetchMedia = async (item: SearchResultItem, type: 'audio' | 'video') => {
    setLoadingMedia({ type, item });
    setMediaError(null);
    setActiveMedia(null);
    setMediaDebugList([]);

    const debugAttempts: ApiDebugInfo[] = [];
    const youtubeUrl = item.url || `https://www.youtube.com/watch?v=${item.videoId}`;

    try {
      let response;
      if (type === 'audio') {
        response = await apiClient.getAudioDownload(youtubeUrl);
      } else {
        response = await apiClient.getVideoDownload(youtubeUrl, '720');
      }

      if (!response.success || !response.result) {
        debugAttempts.push({
          stepName: `Worker API Request (/${type})`,
          requestUrl: `${WORKER_BASE_URL}/${type}?url=${encodeURIComponent(youtubeUrl)}`,
          httpStatus: 'API Error',
          errorMessage: response.message || `Gagal mengambil data download ${type}.`,
          responseBody: JSON.stringify(response, null, 2),
          provider: response.provider || 'shiroapi',
          apiKeyStatus: 'Active',
        });
        setMediaDebugList(debugAttempts);
        throw new Error(response.message || `API Worker tidak memberikan data download untuk media ${type}.`);
      }

      const resObj = response.result;
      const downloadUrl =
        resObj.download ||
        resObj.url ||
        resObj.link ||
        (typeof resObj === 'string' ? resObj : '') ||
        item.url ||
        youtubeUrl;

      if (!downloadUrl) {
        throw new Error(`API Worker tidak mengembalikan link download ${type} yang valid.`);
      }

      setActiveMedia({
        type,
        item,
        downloadUrl,
        title: resObj.title || item.title,
        thumbnail: resObj.thumbnail || item.thumbnail,
        duration: resObj.duration || item.duration || '',
        quality: resObj.quality || (type === 'video' ? '720p' : '320kbps MP3'),
      });

      ActivityService.logActivity(
        'music_play',
        'Memutar Lagu / Video',
        `Memutar ${type === 'audio' ? 'Audio MP3' : 'Video 720p'}: "${resObj.title || item.title}"`
      );
    } catch (err: any) {
      console.error('Media download error:', err);
      setMediaError(err.message || `Gagal memuat media ${type} dari Worker API.`);
    } finally {
      setLoadingMedia(null);
    }
  };

  // Handle TikTok Download via API Client
  const handleTikTokDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = tiktokUrlInput.trim();
    if (!input) return;

    setIsTiktokLoading(true);
    setMediaError(null);
    setActiveMedia(null);

    const dummyItem: SearchResultItem = {
      videoId: 'tiktok_video',
      url: input,
      title: 'TikTok Downloader (No Watermark)',
      channel: 'TikTok Creator',
      thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
    };

    setLoadingMedia({ type: 'tiktok', item: dummyItem });

    try {
      const response = await apiClient.getTikTokDownload(input);

      if (!response.success || !response.result) {
        throw new Error(response.message || 'Gagal mengunduh video TikTok dari Worker API.');
      }

      const resObj = response.result;
      const downloadUrl =
        resObj.download ||
        resObj.nowatermark ||
        resObj.url ||
        resObj.link ||
        (typeof resObj === 'string' ? resObj : '');

      if (!downloadUrl) {
        throw new Error('API Worker tidak mengembalikan link download TikTok yang valid.');
      }

      setActiveMedia({
        type: 'tiktok',
        item: {
          ...dummyItem,
          title: resObj.title || 'TikTok Video (No Watermark)',
          channel: resObj.author || resObj.nickname || 'TikTok User',
          thumbnail: resObj.thumbnail || resObj.cover || dummyItem.thumbnail,
        },
        downloadUrl,
        title: resObj.title || 'TikTok Video (No Watermark)',
        thumbnail: resObj.thumbnail || resObj.cover || dummyItem.thumbnail,
        quality: 'HD No Watermark',
      });

      ActivityService.logActivity(
        'music_play',
        'Download TikTok',
        `TikTok Downloader: "${resObj.title || input}"`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal mengunduh video TikTok.');
    } finally {
      setIsTiktokLoading(false);
      setLoadingMedia(null);
    }
  };

  // Handle Spotify Download via API Client
  const handleSpotifyDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = spotifyInput.trim();
    if (!input) return;

    setIsSpotifyLoading(true);
    setMediaError(null);
    setActiveMedia(null);

    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    const dummyItem: SearchResultItem = {
      videoId: 'spotify_track',
      url: input,
      title: isUrl ? 'Spotify Downloader' : input,
      channel: 'Spotify Artist',
      thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
    };

    setLoadingMedia({ type: 'spotify', item: dummyItem });

    try {
      let response;
      if (isUrl) {
        response = await apiClient.getSpotifyDownload(input);
      } else {
        response = await apiClient.searchSpotify(input);
      }

      if (!response.success || !response.result) {
        throw new Error(response.message || 'Gagal memproses lagu Spotify dari Worker API.');
      }

      const resObj = response.result;
      const downloadUrl =
        resObj.download ||
        resObj.link ||
        resObj.url ||
        resObj.audio ||
        (typeof resObj === 'string' ? resObj : '');

      if (!downloadUrl && !Array.isArray(resObj)) {
        throw new Error('Link download MP3 Spotify tidak ditemukan.');
      }

      setActiveMedia({
        type: 'spotify',
        item: {
          ...dummyItem,
          title: resObj.title || resObj.name || input,
          channel: resObj.artist || resObj.artists || 'Spotify Track',
          thumbnail: resObj.thumbnail || resObj.cover || dummyItem.thumbnail,
        },
        downloadUrl: downloadUrl || '',
        title: resObj.title || resObj.name || input,
        thumbnail: resObj.thumbnail || resObj.cover || dummyItem.thumbnail,
        quality: 'Spotify 320kbps MP3',
      });

      ActivityService.logActivity(
        'music_play',
        'Spotify Downloader',
        `Memproses Spotify: "${resObj.title || input}"`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses Spotify.');
    } finally {
      setIsSpotifyLoading(false);
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
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Worker Gateway Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Base Worker URL: <code className="text-sky-300 font-mono font-bold">{WORKER_BASE_URL}</code> 🐎
              </p>
            </div>
          </div>

          {/* Service Selector Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTabMode('youtube')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'youtube'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </button>
            <button
              onClick={() => setActiveTabMode('tiktok')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'tiktok'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>TikTok</span>
            </button>
            <button
              onClick={() => setActiveTabMode('spotify')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'spotify'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Spotify</span>
            </button>
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
                🐴 Oguri Cap sedang mengunduh via Worker API...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Menghubungi Cloudflare Worker Gateway (<code className="text-emerald-300">{WORKER_BASE_URL}</code>)...
              </p>
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
        <div className="space-y-4">
          <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-6 shadow-xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-red-300">Gagal Memproses Media</h3>
            <p className="text-xs text-red-200/80 max-w-lg mx-auto">{mediaError}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setMediaError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>

          <DebugCard debugList={mediaDebugList} title="🌐 Log Error Worker API" />
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
                {activeMedia.type.toUpperCase()} Player Ready (via Worker Gateway)
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
              {activeMedia.thumbnail || activeMedia.item.thumbnail ? (
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
                {activeMedia.duration && (
                  <p className="text-[11px] text-slate-400">⏱️ Durasi: {activeMedia.duration}</p>
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
              {activeMedia.type === 'audio' || activeMedia.type === 'spotify' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      HTML5 Audio Source (via Worker)
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
                    <span className="text-emerald-400">✓ MP3 Audio Stream</span>
                    <a
                      href={activeMedia.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh Berkas MP3
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
                      {activeMedia.quality || 'Video Stream'}
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

      {/* Mode 1: YouTube Search Section */}
      {activeTabMode === 'youtube' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik judul lagu, OST anime, atau penyanyi YouTube..."
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
      )}

      {/* Mode 2: TikTok Downloader Section */}
      {activeTabMode === 'tiktok' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-1 border-b border-slate-800">
            <Film className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">TikTok Downloader (No Watermark)</h3>
          </div>
          <form onSubmit={handleTikTokDownload} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={tiktokUrlInput}
                onChange={(e) => setTiktokUrlInput(e.target.value)}
                placeholder="Paste URL video TikTok (misal: https://www.tiktok.com/@user/video/...)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isTiktokLoading || !tiktokUrlInput.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all flex-shrink-0"
            >
              {isTiktokLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses TikTok...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download TikTok</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Mode 3: Spotify Downloader Section */}
      {activeTabMode === 'spotify' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-1 border-b border-slate-800">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Spotify Downloader & Search</h3>
          </div>
          <form onSubmit={handleSpotifyDownload} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={spotifyInput}
                onChange={(e) => setSpotifyInput(e.target.value)}
                placeholder="Ketik judul lagu / paste URL Spotify (misal: https://open.spotify.com/track/...)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSpotifyLoading || !spotifyInput.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all flex-shrink-0"
            >
              {isSpotifyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Spotify...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Proses Spotify</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* YouTube Search Results Grid */}
      {activeTabMode === 'youtube' && (
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
            <div className="space-y-4 mb-4">
              <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 text-center space-y-2">
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

              <DebugCard debugList={searchDebugList} title="🌐 Log Error Worker API Search" />
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
                        <span>🎧 Audio MP3</span>
                      </button>

                      <button
                        onClick={() => handleFetchMedia(item, 'video')}
                        className="flex-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>🎥 Video 720p</span>
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
      )}
    </div>
  );
};

