import React, { useState } from 'react';
import {
  Search,
  Music,
  Video,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  RefreshCw,
  Volume2,
  Download,
  Film,
  Radio,
  ArrowLeft,
  Heart,
  ListMusic,
  Trash2,
} from 'lucide-react';
import { ActivityService } from '../services/ActivityService';
import { apiClient, SearchItem } from '../api/client';
import { useAudioPlayer, JukeboxTrack } from '../context/AudioPlayerContext';
import { YouTubeQualityModal } from './YouTubeQualityModal';

export type SearchResultItem = SearchItem;

interface MediaState {
  type: 'audio' | 'video' | 'tiktok' | 'spotify';
  item: SearchResultItem;
  downloadUrl: string;
  title: string;
  thumbnail: string;
  duration?: string;
  quality?: string;
  fallbackUrls?: string[];
  currentFallbackIndex?: number;
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

export const DebugCard: React.FC<{ debugList: ApiDebugInfo[]; title?: string }> = ({ debugList, title }) => {
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

// ==========================================
// UTILITY / HELPER FUNCTIONS (DI LUAR KOMPONEN UTAMA)
// ==========================================
const isDirectAudioUrl = (url?: string) => {
  return !!url && /^https?:\/\//i.test(url) && !/youtu\.be|youtube\.com|spotify\.com/i.test(url);
};

const getYoutubeSourceUrl = (item: SearchResultItem) => {
  const rawUrl = typeof item.url === 'string' ? item.url.trim() : '';
  if (rawUrl) return rawUrl;
  const videoId = typeof item.videoId === 'string' ? item.videoId.trim().replace(/^yt_/, '') : '';
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
};

const getSpotifyTrackId = (item: SearchResultItem, fallbackId = '') => {
  const baseId =
    fallbackId.trim() ||
    (typeof item.id === 'string' && item.id.trim()) ||
    (typeof item.uri === 'string' ? item.uri.split(':').pop() || '' : '') ||
    (typeof item.videoId === 'string' && item.videoId.trim()) ||
    (typeof item.spotifyUrl === 'string' && item.spotifyUrl.trim()) ||
    (typeof item.url === 'string' && item.url.trim()) ||
    item.title ||
    'spotify_track';

  return baseId.startsWith('sp_') ? baseId : `sp_${baseId}`;
};

const buildSpotifyJukeboxTrack = (item: SearchResultItem, downloadUrl: string, media: any = {}): JukeboxTrack => {
  const trackId = getSpotifyTrackId(item, String(media?.id || media?.uri?.split?.(':')?.pop?.() || ''));

  const pickText = (val: any, fallback = ''): string => {
    if (val == null) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number' || typeof val === 'bigint') return String(val);
    if (Array.isArray(val)) {
      const list = val.map((v) => pickText(v, '')).filter(Boolean);
      return list.length > 0 ? list.join(', ') : fallback;
    }
    if (typeof val === 'object') {
      if (typeof val.name === 'string') return val.name;
      if (typeof val.title === 'string') return val.title;
      if (typeof val.artist === 'string') return val.artist;
    }
    return fallback;
  };

  const thumbnailCandidates = [
    media?.thumbnail,
    media?.cover,
    media?.image,
    media?.album?.images?.[0]?.url,
    media?.images?.[0]?.url,
    item.thumbnail,
  ];

  const thumbnail =
    thumbnailCandidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value)) ||
    item.thumbnail ||
    'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1';

  const durationValue = media?.duration || media?.duration_ms || item.duration || '';
  const duration = typeof durationValue === 'number' ? String(durationValue) : String(durationValue || '');

  return {
    trackId,
    source: 'spotify',
    videoId: String(media?.url || media?.link || item.spotifyUrl || item.url || media?.external_urls?.spotify || media?.id || item.id || item.uri?.split(':').pop() || trackId),
    sourceUrl: String(item.spotifyUrl || item.url || media?.external_urls?.spotify || media?.url || media?.link || ''),
    title: pickText(media?.title || media?.name || item.title, 'Spotify Track'),
    artist: pickText(media?.artist || media?.artists || media?.channel || item.channel, 'Spotify Artist'),
    thumbnail,
    downloadUrl,
    duration,
    quality: media?.quality || 'Spotify MP3',
    audioExpireAt: media?.audioExpireAt || media?.audio_expire_at || null,
    isFavorite: media?.isFavorite,
    lastPlayedAt: media?.lastPlayedAt || media?.last_played_at || Date.now(),
  };
};

const buildAudioFileName = (title: string, extension = 'mp3') => {
  const safe = (title || 'audio').replace(/[\/:*?"<>|]+/g, '_').trim() || 'audio';
  return `${safe}.${extension}`;
};

const downloadAudioFromUrl = async (url: string, fileName: string) => {
  try {
    // Jangan gunakan fetch() dan blob() untuk file audio streaming yang besar
    // karena bisa merusak header atau memotong data stream. 
    // Langsung buka/unduh link aslinya lewat elemen anchor.
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (err) {
    console.warn('[AUDIO DOWNLOAD WARN] Gagal mengunduh:', err);
  }
};

const resolveTrackAudioUrl = async (track: JukeboxTrack) => {
  const directAudioUrl = isDirectAudioUrl(track.downloadUrl) ? track.downloadUrl : '';
  if (directAudioUrl) return directAudioUrl;

  const sourceUrl =
    track.sourceUrl ||
    (track.source === 'spotify'
      ? track.videoId || track.trackId
      : getYoutubeSourceUrl({
          videoId: track.videoId,
          url: track.videoId && /^https?:\/\//i.test(track.videoId) ? track.videoId : '',
          title: track.title,
        } as SearchResultItem)) ||
    '';

  if (!sourceUrl) {
    throw new Error('Sumber lagu tidak ditemukan.');
  }

  const response =
    track.source === 'spotify'
      ? await apiClient.getSpotifyDownload(sourceUrl)
      : await apiClient.getAudioDownload(sourceUrl);

  if (!response.success || !response.result) {
    throw new Error(response.message || 'Gagal mengambil link audio.');
  }

  const resObj = response.result;
  const audioUrl =
    (isDirectAudioUrl(resObj.download) && resObj.download) ||
    (isDirectAudioUrl(resObj.url) && resObj.url) ||
    (isDirectAudioUrl(resObj.link) && resObj.link) ||
    (isDirectAudioUrl(resObj.audio) && resObj.audio) ||
    (isDirectAudioUrl(resObj.mp3) && resObj.mp3) ||
    (typeof resObj === 'string' && isDirectAudioUrl(resObj) ? resObj : '');

  if (!audioUrl) {
    throw new Error('Link audio tidak ditemukan.');
  }

  return audioUrl;
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export const MusicPlayViewer: React.FC = () => {
  const [activeTabMode, setActiveTabMode] = useState<'youtube' | 'tiktok' | 'spotify' | 'playlist'>('playlist');

  const {
    currentTrack,
    playlist,
    favorites,
    isPlaying,
    playTrack,
    togglePlayPause,
    toggleFavorite,
    removeFromPlaylist,
  } = useAudioPlayer();

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
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);
  const [spotifySearchError, setSpotifySearchError] = useState<string | null>(null);
  const [spotifyResults, setSpotifyResults] = useState<SearchResultItem[]>([]);
  const [hasSpotifySearched, setHasSpotifySearched] = useState(false);

  // Loading & Active Media State
  const [loadingMedia, setLoadingMedia] = useState<{
    type: 'audio' | 'video' | 'tiktok' | 'spotify';
    item: SearchResultItem;
  } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaState | null>(null);
  const [mediaDebugList, setMediaDebugList] = useState<ApiDebugInfo[]>([]);

  // YouTube Quality Selector Modal State
  const [ytQualityModalOpen, setYtQualityModalOpen] = useState(false);
  const [pendingYtDownload, setPendingYtDownload] = useState<{
    item: SearchResultItem;
    youtubeUrl: string;
  } | null>(null);

  // Quick preset suggestions
  const presetQueries = [
    'Umapyoi Densetsu',
    'GIRLS LEGEND U',
    'Oguri Cap Theme',
    'Kaikai Kitan',
    'Yoasobi Idol',
    'Blue Bird Naruto',
  ];

  // Open Quality Selector Modal when user wants to download YouTube Video
  const handleRequestVideoDownload = (item: SearchResultItem) => {
    const youtubeUrl = getYoutubeSourceUrl(item);
    setPendingYtDownload({ item, youtubeUrl });
    setYtQualityModalOpen(true);
  };

  // Handle selected YouTube quality from Floating Modal
  const handleConfirmVideoQuality = async (qualityValue: string, qualityLabel: string) => {
    if (!pendingYtDownload) return;
    const { item, youtubeUrl } = pendingYtDownload;
    setYtQualityModalOpen(false);
    setPendingYtDownload(null);

    await handleFetchVideoWithQuality(item, youtubeUrl, qualityValue, qualityLabel);
  };

  // Execute YouTube Video download with chosen quality parameter ("360", "480", "720", "1080", "1440", "2k")
  const handleFetchVideoWithQuality = async (
    item: SearchResultItem,
    youtubeUrl: string,
    qualityValue: string,
    qualityLabel: string
  ) => {
    setLoadingMedia({ type: 'video', item });
    setMediaError(null);
    setActiveMedia(null);
    setMediaDebugList([]);

    const debugAttempts: ApiDebugInfo[] = [];

    try {
      const response = await apiClient.getVideoDownload(youtubeUrl, qualityValue);

      if (!response.success || !response.result) {
        debugAttempts.push({
          stepName: `Worker API Request (/video?quality=${qualityValue})`,
          requestUrl: `Worker Gateway video (${qualityLabel})`,
          httpStatus: 'API Error',
          errorMessage: response.message || `Gagal mengambil video YouTube ${qualityLabel}.`,
          responseBody: JSON.stringify(response, null, 2),
          provider: response.provider || 'shiroapi',
          apiKeyStatus: 'Active',
        });
        setMediaDebugList(debugAttempts);
        throw new Error(response.message || `API Worker tidak memberikan data download untuk video (${qualityLabel}).`);
      }

      const resObj = response.result;
      const downloadUrl =
        resObj.download ||
        resObj.url ||
        resObj.link ||
        (typeof resObj === 'string' ? resObj : '');

      if (!downloadUrl) {
        throw new Error(`API Worker tidak mengembalikan link download video (${qualityLabel}) yang valid.`);
      }

      const mediaTitle = resObj.title || item.title;
      const mediaThumb = resObj.thumbnail || item.thumbnail;

      setActiveMedia({
        type: 'video',
        item,
        downloadUrl,
        title: mediaTitle,
        thumbnail: mediaThumb,
        duration: resObj.duration || item.duration || '',
        quality: `${qualityLabel} (${qualityValue})`,
      });

      ActivityService.logActivity(
        'music_play',
        'Download Video YouTube',
        `Memutar / Unduh Video ${qualityLabel}: "${mediaTitle}"`
      );
    } catch (err: any) {
      console.error('YouTube Video Download error:', err);
      setMediaError(err.message || `Gagal memuat video ${qualityLabel} dari Worker API.`);
    } finally {
      setLoadingMedia(null);
    }
  };

  // Handle YouTube Search via API Client
  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const searchQuery = (searchOverride || query).trim();
    if (!searchQuery) return;

    // Check if user submitted a direct YouTube URL
    const isYtUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(searchQuery);
    if (isYtUrl) {
      const dummyItem: SearchResultItem = {
        videoId: 'yt_direct_url',
        url: searchQuery,
        title: 'YouTube Video Link',
        channel: 'YouTube Content',
        thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      };
      setPendingYtDownload({ item: dummyItem, youtubeUrl: searchQuery });
      setYtQualityModalOpen(true);
      return;
    }

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
          requestUrl: `Worker Gateway Search`,
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

  // Handle Fetch YouTube Audio via API Client
  const handleFetchMedia = async (item: SearchResultItem, type: 'audio' | 'video') => {
    if (type === 'video') {
      handleRequestVideoDownload(item);
      return;
    }

    setLoadingMedia({ type: 'audio', item });
    setMediaError(null);
    setActiveMedia(null);
    setMediaDebugList([]);

    const debugAttempts: ApiDebugInfo[] = [];
    const youtubeUrl = getYoutubeSourceUrl(item);

    try {
      const response = await apiClient.getAudioDownload(youtubeUrl);

      if (!response.success || !response.result) {
        debugAttempts.push({
          stepName: 'Worker API Request (/audio)',
          requestUrl: 'Worker Gateway audio',
          httpStatus: 'API Error',
          errorMessage: response.message || 'Gagal mengambil data download audio.',
          responseBody: JSON.stringify(response, null, 2),
          provider: response.provider || 'shiroapi',
          apiKeyStatus: 'Active',
        });
        setMediaDebugList(debugAttempts);
        throw new Error(response.message || 'API Worker tidak memberikan data download untuk audio MP3.');
      }

      const resObj = response.result;
      const downloadUrl =
        resObj.download ||
        resObj.url ||
        resObj.link ||
        (typeof resObj === 'string' ? resObj : '');

      if (!downloadUrl) {
        throw new Error('API Worker tidak mengembalikan link download audio MP3 yang valid.');
      }

      const mediaTitle = resObj.title || item.title;
      const mediaThumb = resObj.thumbnail || item.thumbnail;
      const mediaArtist = item.channel || 'Artist';

      const jukeboxTrack: JukeboxTrack = {
        trackId: item.videoId || `yt_${Date.now()}`,
        source: 'youtube',
        videoId: item.videoId || '',
        sourceUrl: youtubeUrl,
        title: mediaTitle,
        artist: mediaArtist,
        thumbnail: mediaThumb,
        downloadUrl,
        duration: resObj.duration || item.duration || '',
        quality: resObj.quality || '320kbps MP3',
      };

      await playTrack(jukeboxTrack);

      ActivityService.logActivity(
        'music_play',
        'Memutar Lagu',
        `Memutar Audio MP3: "${mediaTitle}"`
      );
    } catch (err: any) {
      console.error('Audio download error:', err);
      setMediaError(err.message || 'Gagal memuat audio MP3 dari Worker API.');
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
        typeof resObj.download === 'string'
          ? resObj.download
          : typeof resObj.nowatermark === 'string'
          ? resObj.nowatermark
          : typeof resObj.url === 'string'
          ? resObj.url
          : typeof resObj.link === 'string'
          ? resObj.link
          : resObj.proxyUrl || '';

      if (!downloadUrl) {
        throw new Error('API Worker/Server tidak mengembalikan link download TikTok yang valid.');
      }

      const fallbacks: string[] = Array.isArray(resObj.fallbackUrls) ? resObj.fallbackUrls : [];
      if (resObj.proxyUrl && !fallbacks.includes(resObj.proxyUrl)) {
        fallbacks.push(resObj.proxyUrl);
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
        fallbackUrls: fallbacks,
        currentFallbackIndex: 0,
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

  const handleSpotifyToggleFavorite = async (item: SearchResultItem) => {
    const spotifyUrl = item.spotifyUrl || item.url;
    if (!spotifyUrl) {
      setMediaError('URL Spotify untuk hasil ini tidak ditemukan.');
      return;
    }

    const trackId = getSpotifyTrackId(item);
    const existingFavorite = favorites.find((fav) => fav.trackId === trackId);

    if (existingFavorite) {
      await toggleFavorite(existingFavorite);
      return;
    }

    setMediaError(null);

    const spTrack = buildSpotifyJukeboxTrack(item, '', {
      id: item.id,
      uri: item.uri,
      url: spotifyUrl,
      name: item.title,
      artist: item.channel,
      album: item.album,
      thumbnail: item.thumbnail,
    });

    await toggleFavorite(spTrack);
  };

  // Handle Spotify Download via API Client
  const handleSpotifyDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = spotifyInput.trim();
    if (!input) return;

    const isUrl = /^https?:\/\//i.test(input);
    const spotifyPreviewItem: SearchResultItem = {
      videoId: 'spotify_track',
      url: input,
      title: isUrl ? 'Spotify Downloader' : input,
      channel: 'Spotify Artist',
      thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      source: 'spotify',
    };

    setMediaError(null);
    setActiveMedia(null);
    setSpotifySearchError(null);

    if (!isUrl) {
      setHasSpotifySearched(true);
      setIsSpotifySearching(true);
      setLoadingMedia({ type: 'spotify', item: spotifyPreviewItem });
      setSpotifyResults([]);

      try {
        const response = await apiClient.searchSpotify(input, 50);

        if (!response.success || !response.result) {
          throw new Error(response.message || 'Gagal mencari lagu Spotify dari Worker API.');
        }

        const results = response.result.filter((item) => {
          const type = String(item?.type || '').toLowerCase();
          if (!type) return true;
          return type === 'track' || type === 'audio' || item?.durationMs || item?.duration;
        });

        if (results.length === 0) {
          setSpotifySearchError('Hasil pencarian Spotify tidak ditemukan.');
          setSpotifyResults([]);
          return;
        }

        setSpotifyResults(results);
      } catch (err: any) {
        setSpotifySearchError(err.message || 'Gagal mencari lagu Spotify.');
      } finally {
        setIsSpotifySearching(false);
        setLoadingMedia(null);
      }

      return;
    }

    setHasSpotifySearched(false);
    setIsSpotifyLoading(true);
    setLoadingMedia({ type: 'spotify', item: spotifyPreviewItem });

    try {
      const response = await apiClient.getSpotifyDownload(input);

      if (!response.success || !response.result) {
        throw new Error(response.message || 'Gagal memproses lagu Spotify dari Worker API.');
      }

      const resObj = response.result;
      const downloadUrl =
        (isDirectAudioUrl(resObj.download) && resObj.download) ||
        (isDirectAudioUrl(resObj.url) && resObj.url) ||
        (isDirectAudioUrl(resObj.link) && resObj.link) ||
        (isDirectAudioUrl(resObj.audio) && resObj.audio) ||
        (isDirectAudioUrl(resObj.mp3) && resObj.mp3) ||
        '';

      if (!downloadUrl) {
        throw new Error('Link download MP3 Spotify tidak ditemukan.');
      }

      const spTrack = buildSpotifyJukeboxTrack(spotifyPreviewItem, downloadUrl, resObj);
      await playTrack(spTrack);

      ActivityService.logActivity(
        'music_play',
        'Spotify Downloader',
        `Memproses Spotify: "${spTrack.title}"`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses Spotify.');
    } finally {
      setIsSpotifyLoading(false);
      setLoadingMedia(null);
    }
  };

  const handleSpotifyPlayResult = async (item: SearchResultItem) => {
    const spotifyUrl = item.spotifyUrl || item.url;
    if (!spotifyUrl) {
      setMediaError('URL Spotify untuk hasil ini tidak ditemukan.');
      return;
    }

    setIsSpotifyLoading(true);
    setMediaError(null);
    setActiveMedia(null);
    setLoadingMedia({ type: 'spotify', item });

    try {
      const response = await apiClient.getSpotifyDownload(spotifyUrl);

      if (!response.success || !response.result) {
        throw new Error(response.message || 'Gagal memproses lagu Spotify dari Worker API.');
      }

      const resObj = response.result;
      const downloadUrl =
        (isDirectAudioUrl(resObj.download) && resObj.download) ||
        (isDirectAudioUrl(resObj.url) && resObj.url) ||
        (isDirectAudioUrl(resObj.link) && resObj.link) ||
        (isDirectAudioUrl(resObj.audio) && resObj.audio) ||
        (isDirectAudioUrl(resObj.mp3) && resObj.mp3) ||
        '';

      if (!downloadUrl) {
        throw new Error('Link download MP3 Spotify tidak ditemukan.');
      }

      const spTrack = buildSpotifyJukeboxTrack(item, downloadUrl, resObj);
      await playTrack(spTrack);

      ActivityService.logActivity(
        'music_play',
        'Spotify Downloader',
        `Memproses Spotify: "${spTrack.title}"`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses Spotify.');
    } finally {
      setIsSpotifyLoading(false);
      setLoadingMedia(null);
    }
  };

  const handlePlaylistDownload = async (track: JukeboxTrack) => {
    try {
      setMediaError(null);

      const audioUrl = await resolveTrackAudioUrl(track);
      if (!audioUrl) {
        throw new Error('Link audio tidak ditemukan.');
      }

      const fileName = buildAudioFileName(track.title);
      await downloadAudioFromUrl(audioUrl, fileName);

      ActivityService.logActivity(
        'music_play',
        'Download Lagu',
        `Mengunduh ${track.title}`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal mengunduh audio dari playlist.');
    }
  };

  const handleCurrentTrackDownload = async () => {
    if (!currentTrack) return;

    try {
      setMediaError(null);

      const audioUrl = await resolveTrackAudioUrl(currentTrack as JukeboxTrack);
      if (!audioUrl) {
        throw new Error('Link audio tidak ditemukan.');
      }

      const fileName = buildAudioFileName(currentTrack.title);
      await downloadAudioFromUrl(audioUrl, fileName);

      ActivityService.logActivity(
        'music_play',
        'Download Lagu',
        `Mengunduh ${currentTrack.title}`
      );
    } catch (err: any) {
      setMediaError(err.message || 'Gagal mengunduh lagu yang sedang diputar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Oguri Jukebox */}
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
                  🎵 Oguri Jukebox
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Putar musik favoritmu tanpa terputus saat menjelajahi Tracen Academy 🐎
              </p>
            </div>
          </div>

          {/* Service Selector Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTabMode('playlist')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'playlist'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playlist ({playlist.length})</span>
            </button>
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

      {/* Loading Media Box */}
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
                🐴 Oguri Cap sedang memproses media...
              </h3>
            </div>

            {/* Target Media Preview */}
            <div className="flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-left">
              {loadingMedia.item.thumbnail && (
                <img
                  src={loadingMedia.item.thumbnail}
                  alt={loadingMedia.item.title}
                  className="w-12 h-12 rounded-lg object-cover object-center aspect-square overflow-hidden flex-shrink-0"
                  style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
                />
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{loadingMedia.item.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{loadingMedia.item.channel}</p>
              </div>
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

      {currentTrack && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-4 shadow-2xl relative overflow-hidden transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                {currentTrack.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover object-center"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Music className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                  Sedang diputar
                </p>
                <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => togglePlayPause()}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all flex items-center gap-2 text-xs font-semibold"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={handleCurrentTrackDownload}
                className="px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition-all flex items-center gap-2 text-xs font-semibold"
                title="Download Audio MP3"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Box (For Video & TikTok Stream) */}
      {activeMedia && (activeMedia.type === 'video' || activeMedia.type === 'tiktok') && !loadingMedia && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <button
              onClick={() => setActiveMedia(null)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup Video</span>
            </button>
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
              <Film className="w-4 h-4" /> {activeMedia.type === 'tiktok' ? 'TikTok Video Player' : 'Video Player'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl relative">
              <video
                key={activeMedia.downloadUrl}
                controls
                autoPlay
                playsInline
                referrerPolicy="no-referrer"
                src={activeMedia.downloadUrl}
                className="w-full max-h-[480px] object-contain rounded-xl"
                onError={() => {
                  if (activeMedia.fallbackUrls && activeMedia.fallbackUrls.length > 0) {
                    const currentIndex = activeMedia.currentFallbackIndex || 0;
                    if (currentIndex < activeMedia.fallbackUrls.length) {
                      const nextUrl = activeMedia.fallbackUrls[currentIndex];
                      setActiveMedia((prev) =>
                        prev
                          ? {
                              ...prev,
                              downloadUrl: nextUrl,
                              currentFallbackIndex: currentIndex + 1,
                            }
                          : null
                      );
                    }
                  }
                }}
              >
                Browser Anda tidak mendukung elemen video.
              </video>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 gap-2">
              <div className="overflow-hidden space-y-0.5">
                <span className="text-xs font-bold text-purple-300 block truncate">
                  {activeMedia.title}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  👤 {activeMedia.item.channel || 'TikTok Creator'}
                </span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
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
          </div>
        </div>
      )}

      {/* MODE 1: PLAYLIST VIEW (OGURI JUKEBOX) */}
      {activeTabMode === 'playlist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ListMusic className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Daftar Putar Oguri Jukebox</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
                {playlist.length} Lagu
              </span>
            </div>
          </div>

          {playlist.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <Music className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-medium">Playlist Anda masih kosong.</p>
              <p className="text-[11px] text-slate-500">
                Cari lagu di tab YouTube / Spotify atau tekan tombol ❤️ Love pada lagu favoritmu.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {playlist.map((track) => {
                const isCurrentlyPlaying = currentTrack?.trackId === track.trackId && isPlaying;
                const isFav = favorites.some((f) => f.trackId === track.trackId);

                return (
                  <div
                    key={track.trackId}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      currentTrack?.trackId === track.trackId
                        ? 'bg-sky-950/40 border-sky-500/50 shadow-md'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Clickable Track Info */}
                    <div
                      onClick={() => playTrack(track, playlist)}
                      className="flex items-center space-x-3 flex-1 overflow-hidden cursor-pointer group"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover object-center aspect-square overflow-hidden group-hover:scale-105 transition-transform"
                            style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Music className="w-6 h-6" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCurrentlyPlaying ? (
                            <Pause className="w-5 h-5 text-white fill-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="overflow-hidden">
                        <h4
                          className={`text-xs font-bold truncate ${
                            currentTrack?.trackId === track.trackId
                              ? 'text-sky-300'
                              : 'text-white group-hover:text-sky-300'
                          }`}
                        >
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                    </div>

                    {/* Actions: Love ❤️, Download Audio, Remove */}
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleFavorite(track);
                        }}
                        title={isFav ? 'Disukai' : 'Sukai Lagu'}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-red-400 transition-all relative z-20 cursor-pointer pointer-events-auto"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isFav ? 'text-red-500 fill-red-500' : 'text-slate-400'
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistDownload(track);
                        }}
                        title="Download Audio MP3"
                        className="p-2 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition-all text-xs flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!track.downloadUrl && !track.videoId && !track.sourceUrl}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => removeFromPlaylist(track.trackId)}
                        title="Hapus dari Playlist"
                        className="p-2 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: YouTube Search Section */}
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

          {/* Search Results Display */}
          {!isSearching && searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
              {searchResults.map((item, idx) => {
                const trackId = item.videoId || `yt_${idx}`;
                const isFav = favorites.some((f) => f.trackId === trackId);

                return (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3.5 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full sm:w-28 h-28 sm:h-28 rounded-xl overflow-hidden aspect-square bg-slate-900 flex-shrink-0 border border-slate-800">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover object-center aspect-square overflow-hidden group-hover:scale-105 transition-transform"
                          style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Music className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info & Action Buttons */}
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-sky-300 transition-colors">
                            {item.title}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              toggleFavorite({
                                trackId,
                                source: item.source || 'youtube',
                                videoId: item.videoId || trackId,
                                sourceUrl: getYoutubeSourceUrl(item),
                                title: item.title,
                                artist: item.channel || 'YouTube Artist',
                                thumbnail: item.thumbnail,
                                downloadUrl: '',
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all flex-shrink-0 relative z-20 cursor-pointer pointer-events-auto"
                            title={isFav ? 'Disukai' : 'Sukai Lagu'}
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isFav ? 'text-red-500 fill-red-500' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{item.channel}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          onClick={() => handleFetchMedia(item, 'audio')}
                          className="flex-1 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>🎧 Putar MP3</span>
                        </button>

                        <button
                          onClick={() => handleFetchMedia(item, 'video')}
                          className="flex-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>🎥 Video</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: TikTok Downloader Section */}
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

      {/* MODE 4: Spotify Downloader Section */}
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
              disabled={(isSpotifyLoading || isSpotifySearching) || !spotifyInput.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all flex-shrink-0"
            >
              {isSpotifyLoading || isSpotifySearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{/^https?:\/\//i.test(spotifyInput.trim()) ? 'Memproses Spotify...' : 'Mencari Spotify...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Proses Spotify</span>
                </>
              )}
            </button>
          </form>

          {spotifySearchError && (
            <div className="bg-red-950/35 border border-red-500/40 rounded-xl p-4 text-sm text-red-200">
              {spotifySearchError}
            </div>
          )}

          {isSpotifySearching && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Mencari hasil Spotify...</span>
            </div>
          )}

          {!isSpotifySearching && hasSpotifySearched && !/^https?:\/\//i.test(spotifyInput.trim()) && spotifyResults.length === 0 && !spotifySearchError && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
              Tidak ada hasil Spotify yang cocok.
            </div>
          )}

          {!isSpotifySearching && spotifyResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[620px] overflow-y-auto pr-1">
              {spotifyResults.map((item, idx) => {
                const isPlayable = String(item.type || '').toLowerCase() === 'track' || !!item.durationMs || !!item.duration;
                return (
                  <div
                    key={`${item.id || item.uri || item.url || idx}`}
                    className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3.5 group"
                  >
                    <div className="relative w-full sm:w-28 h-28 sm:h-28 rounded-xl overflow-hidden aspect-square bg-slate-900 flex-shrink-0 border border-slate-800">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover object-center aspect-square overflow-hidden group-hover:scale-105 transition-transform"
                          style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Volume2 className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                            {item.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                            {String(item.type || 'Track')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{item.channel}</p>
                        {item.playability && (
                          <p className="text-[10px] text-slate-500 truncate">{item.playability}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSpotifyToggleFavorite(item)}
                          className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-red-400"
                          title={favorites.some((f) => f.trackId === getSpotifyTrackId(item)) ? 'Disukai' : 'Sukai Lagu'}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${
                              favorites.some((f) => f.trackId === getSpotifyTrackId(item))
                                ? 'text-red-500 fill-red-500'
                                : 'text-slate-400'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleSpotifyPlayResult(item)}
                          disabled={!isPlayable}
                          className="flex-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>Putar MP3</span>
                        </button>

                        <a
                          href={item.url || item.spotifyUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Buka Spotify</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating YouTube Quality Selection Modal */}
      <YouTubeQualityModal
        isOpen={ytQualityModalOpen}
        videoTitle={pendingYtDownload?.item.title}
        videoUrl={pendingYtDownload?.youtubeUrl}
        thumbnail={pendingYtDownload?.item.thumbnail}
        onSelectQuality={handleConfirmVideoQuality}
        onClose={() => {
          setYtQualityModalOpen(false);
          setPendingYtDownload(null);
        }}
      />
    </div>
  );
};
