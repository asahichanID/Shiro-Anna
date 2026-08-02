import React, { useState } from 'react';
import { Search, X, Video, Music, Loader2, Play, Sparkles, Youtube, Disc, Flame } from 'lucide-react';
import { apiClient } from '../../api/client';
import { NobarMedia } from '../../services/NobarService';
import { useProfile } from '../../context/ProfileContext';

interface NobarSearchModalProps {
  isOpen: boolean;
  type: 'video' | 'music';
  onClose: () => void;
  onSelectMedia: (media: NobarMedia) => void;
}

// Curated official Muse Indonesia anime list guaranteed to display when searching "Muse Indonesia" or "Muse"
const MUSE_INDONESIA_OFFICIAL_ITEMS = [
  {
    id: 'O7zVEA1y7m4',
    videoId: 'O7zVEA1y7m4',
    title: 'SPY x FAMILY - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/O7zVEA1y7m4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=O7zVEA1y7m4',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: '5-jU-z8T7eI',
    videoId: '5-jU-z8T7eI',
    title: 'WIND BREAKER - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/5-jU-z8T7eI/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=5-jU-z8T7eI',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: 'q1_x8O1t2vA',
    videoId: 'q1_x8O1t2vA',
    title: 'One-Punch Man Season 1 - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/q1_x8O1t2vA/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=q1_x8O1t2vA',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: '4J_Hn8r1x0A',
    videoId: '4J_Hn8r1x0A',
    title: 'Classroom of the Elite S3 - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/4J_Hn8r1x0A/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=4J_Hn8r1x0A',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: '0oE48W2u93U',
    videoId: '0oE48W2u93U',
    title: 'Tokyo Revengers - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/0oE48W2u93U/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=0oE48W2u93U',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: 'P_q9Wz_o-9I',
    videoId: 'P_q9Wz_o-9I',
    title: 'Shangri-La Frontier - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/P_q9Wz_o-9I/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=P_q9Wz_o-9I',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: 'm_4H4G3z21s',
    videoId: 'm_4H4G3z21s',
    title: 'Tensei Shitara Slime Datta Ken - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/m_4H4G3z21s/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=m_4H4G3z21s',
    type: 'video' as const,
    source: 'youtube' as const,
  },
  {
    id: '4o_zP-2k4L0',
    videoId: '4o_zP-2k4L0',
    title: 'Solo Leveling - Episode 01 [Sub Indo]',
    channel: 'Muse Indonesia',
    thumbnail: 'https://i.ytimg.com/vi/4o_zP-2k4L0/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=4o_zP-2k4L0',
    type: 'video' as const,
    source: 'youtube' as const,
  },
];

export const NobarSearchModal: React.FC<NobarSearchModalProps> = ({
  isOpen,
  type,
  onClose,
  onSelectMedia,
}) => {
  const { profile } = useProfile();
  const [activeSource, setActiveSource] = useState<'youtube' | 'spotify'>(
    type === 'music' ? 'spotify' : 'youtube'
  );
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLoadingId, setSelectedLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerDirectSearch = async (searchQuery: string, source: 'youtube' | 'spotify') => {
    setQuery(searchQuery);
    setActiveSource(source);
    executeSearch(searchQuery, source);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(query, activeSource);
  };

  const executeSearch = async (searchQuery: string, source: 'youtube' | 'spotify') => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setErrorMsg(null);
    setResults([]);

    try {
      if (source === 'youtube') {
        // Direct YouTube URL parsing
        if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed)) {
          const match = trimmed.match(/(?:v=|\/)([\w-]{11})/);
          if (match && match[1]) {
            const videoId = match[1];
            setResults([
              {
                id: videoId,
                title: `YouTube Video (${videoId})`,
                channel: 'YouTube',
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                videoId: videoId,
                type: type === 'music' ? 'music' : 'video',
                source: 'youtube',
              },
            ]);
            setIsSearching(false);
            return;
          }
        }

        const isMuseQuery = /muse/i.test(trimmed) || /indonesia/i.test(trimmed);

        // Fetch YouTube search via primary Neoxr YTS API (and standard fallback if needed)
        const searchPromises = [apiClient.searchYouTubeNeoxr(trimmed)];
        if (isMuseQuery) {
          searchPromises.push(apiClient.searchYouTubeNeoxr(trimmed + ' anime sub indo'));
        }

        const responses = await Promise.all(searchPromises);
        let rawItems: any[] = [];
        responses.forEach((res) => {
          if (res.success && Array.isArray(res.result)) {
            rawItems.push(...res.result);
          }
        });

        const workerMapped = rawItems.map((item) => ({
          id: item.videoId || item.id || Math.random().toString(36).substring(2),
          title: item.title || 'Video YouTube',
          channel: item.channel || (item as any).author?.name || (item as any).author || 'YouTube Channel',
          thumbnail: item.thumbnail || (item as any).image || '',
          url: item.url || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : ''),
          videoId: item.videoId,
          type: type === 'music' ? ('music' as const) : ('video' as const),
          source: 'youtube' as const,
        }));

        let combined = [...workerMapped];

        // Ensure Muse Indonesia official items are included if searching Muse
        if (isMuseQuery) {
          combined = [...MUSE_INDONESIA_OFFICIAL_ITEMS, ...combined];
        }

        // Deduplicate
        const seen = new Set<string>();
        const uniqueList: any[] = [];
        for (const item of combined) {
          const key = (item.videoId || item.id || item.url).toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          uniqueList.push(item);
        }

        // Sort Muse Indonesia items first if query is muse related
        if (isMuseQuery) {
          uniqueList.sort((a, b) => {
            const aMuse = /muse indonesia/i.test(a.channel) || /muse indonesia/i.test(a.title);
            const bMuse = /muse indonesia/i.test(b.channel) || /muse indonesia/i.test(b.title);
            if (aMuse && !bMuse) return -1;
            if (!aMuse && bMuse) return 1;
            return 0;
          });
        }

        const finalList = uniqueList.slice(0, 15);
        setResults(finalList);
        if (finalList.length === 0) setErrorMsg('Tidak ada video YouTube ditemukan.');
      } else {
        // Spotify Search & Download flow
        if (/^https?:\/\//i.test(trimmed) && trimmed.includes('spotify')) {
          // Direct Spotify Link
          const spRes = await apiClient.getSpotifyDownload(trimmed);
          if (spRes.success && spRes.result) {
            const spObj = spRes.result;
            const singleItem = [
              {
                id: spObj.id || 'sp_' + Date.now(),
                title: spObj.title || 'Spotify Track',
                channel: spObj.artist || spObj.channel || 'Spotify Artist',
                thumbnail: spObj.thumbnail || '',
                url: spObj.download || spObj.url || spObj.link || trimmed,
                sourceUrl: trimmed,
                type: 'music' as const,
                source: 'spotify' as const,
              },
            ];
            setResults(singleItem);
          } else {
            setErrorMsg(spRes.message || 'Gagal memproses URL Spotify.');
          }
        } else {
          // Search Spotify songs
          const spSearch = await apiClient.searchSpotify(trimmed, 12);
          if (spSearch.success && Array.isArray(spSearch.result) && spSearch.result.length > 0) {
            const list = spSearch.result.slice(0, 12).map((item: any) => ({
              id: item.id || item.videoId || Math.random().toString(36).substring(2),
              title: item.title || 'Lagu Spotify',
              channel: item.channel || item.artists || 'Spotify Artist',
              thumbnail: item.thumbnail || item.image || '',
              url: item.url || item.spotifyUrl || '',
              spotifyUrl: item.spotifyUrl || item.url,
              type: 'music' as const,
              source: 'spotify' as const,
            }));
            setResults(list);
          } else {
            // Fallback YouTube Audio search for Spotify missing track
            const ytRes = await apiClient.searchYouTube(trimmed + ' music audio');
            if (ytRes.success && Array.isArray(ytRes.result) && ytRes.result.length > 0) {
              const list = ytRes.result.slice(0, 12).map((item) => ({
                id: item.videoId || item.id || Math.random().toString(36).substring(2),
                title: item.title || 'Musik',
                channel: item.channel || 'Spotify / Music',
                thumbnail: item.thumbnail || '',
                url: item.url || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : ''),
                videoId: item.videoId,
                type: 'music' as const,
                source: 'youtube' as const,
              }));
              setResults(list);
            } else {
              setErrorMsg('Tidak ada lagu Spotify ditemukan.');
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mencari media.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectItem = async (item: any) => {
    setSelectedLoadingId(item.id);
    const activeUserName = profile?.username || 'Trainer Sensei';
    const activeUserAvatar = profile?.avatar;

    try {
      let finalMediaUrl = item.url;
      let finalSourceUrl = item.sourceUrl || item.url;
      const isMusicMode = activeSource === 'spotify' || type === 'music';

      // 1. Spotify Download Resolution
      if (item.source === 'spotify' || activeSource === 'spotify' || item.spotifyUrl) {
        const spUrl = item.spotifyUrl || item.url || `${item.title} ${item.channel}`;
        try {
          const spRes = await apiClient.getSpotifyDownload(spUrl);
          if (spRes.success && spRes.result && (spRes.result.download || spRes.result.url)) {
            finalMediaUrl = spRes.result.download || spRes.result.url;
          } else {
            // Fallback: fetch audio stream using song title + artist
            const query = `${item.title} ${item.channel || ''}`.trim();
            const audioRes = await apiClient.getAudioDownload(query);
            if (audioRes.success && audioRes.result && (audioRes.result.download || audioRes.result.url)) {
              finalMediaUrl = audioRes.result.download || audioRes.result.url;
            }
          }
        } catch (spErr) {
          console.warn('Spotify resolution error, using fallback:', spErr);
        }
      } 
      // 2. YouTube Music / Audio Direct Stream Resolution
      else if (isMusicMode && (item.videoId || item.url)) {
        const targetId = item.videoId || item.url;
        try {
          const audioRes = await apiClient.getAudioDownload(targetId);
          if (audioRes.success && audioRes.result && (audioRes.result.download || audioRes.result.url)) {
            finalMediaUrl = audioRes.result.download || audioRes.result.url;
          }
        } catch (ytAudioErr) {
          console.warn('YouTube audio stream resolution error:', ytAudioErr);
        }
      }

      const mediaPayload: NobarMedia = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.title,
        artistOrChannel: item.channel,
        thumbnail: item.thumbnail,
        url: finalMediaUrl,
        sourceUrl: finalSourceUrl,
        type: isMusicMode ? 'music' : 'video',
        source: item.source || (activeSource === 'spotify' ? 'spotify' : 'youtube'),
        videoId: item.videoId,
        playedBy: activeUserName,
        playedByAvatar: activeUserAvatar,
        playedAt: Date.now(),
      };

      onSelectMedia(mediaPayload);
      onClose();
    } catch (err) {
      console.error('Failed to select media:', err);
    } finally {
      setSelectedLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${type === 'video' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              {type === 'video' ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <span>Cari {type === 'video' ? 'Video YouTube' : 'Musik & Lagu'} Nobar</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">Putar langsung untuk semua user yang ada di ruang Nobar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Selector Tabs */}
        <div className="flex items-center px-5 pt-3 pb-2 bg-slate-900 border-b border-slate-800 space-x-2">
          <span className="text-xs font-bold text-slate-400 mr-2">Sumber Media:</span>
          <button
            type="button"
            onClick={() => {
              setActiveSource('youtube');
              setResults([]);
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeSource === 'youtube'
                ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-400" />
            <span>YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSource('spotify');
              setResults([]);
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeSource === 'spotify'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Disc className="w-4 h-4 text-emerald-400" />
            <span>Spotify</span>
          </button>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="p-4 bg-slate-950/60 border-b border-slate-800 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeSource === 'youtube'
                  ? 'Ketik judul video atau kata kunci YouTube (cth: Muse Indonesia)...'
                  : 'Ketik judul lagu, penyanyi, atau paste link Spotify...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeSource === 'youtube'
                ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
            }`}
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isSearching ? 'Mencari...' : 'Cari'}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/80 border-b border-slate-800 overflow-x-auto text-[11px] font-semibold text-slate-300 custom-scrollbar">
          <span className="text-slate-500 font-bold flex items-center gap-1 flex-shrink-0 mr-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Populer:
          </span>
          <button
            type="button"
            onClick={() => triggerDirectSearch('Muse Indonesia', 'youtube')}
            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
          >
            🔥 Muse Indonesia
          </button>
          <button
            type="button"
            onClick={() => triggerDirectSearch('SPY x FAMILY Sub Indo', 'youtube')}
            className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all cursor-pointer flex-shrink-0"
          >
            📺 SPY x FAMILY
          </button>
          <button
            type="button"
            onClick={() => triggerDirectSearch('WIND BREAKER Sub Indo', 'youtube')}
            className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all cursor-pointer flex-shrink-0"
          >
            ⚡ WIND BREAKER
          </button>
          <button
            type="button"
            onClick={() => triggerDirectSearch('Top Hits Indonesia 2026', 'spotify')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer flex-shrink-0"
          >
            🎧 Hits Indonesia
          </button>
        </div>

        {/* Search Results List (60% chat height scrollable max 10 items) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[60vh] custom-scrollbar">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-center text-sm">
              {errorMsg}
            </div>
          )}

          {!isSearching && results.length === 0 && !errorMsg && (
            <div className="py-12 text-center text-slate-500 space-y-2">
              {type === 'video' ? <Youtube className="w-10 h-10 mx-auto text-slate-600" /> : <Disc className="w-10 h-10 mx-auto text-slate-600" />}
              <p className="text-sm font-medium">Ketik kata kunci lalu tekan <span className="text-slate-300 font-bold">Cari</span></p>
              <p className="text-xs text-slate-600">Maksimal 10 hasil teratas akan ditampilkan</p>
            </div>
          )}

          {results.map((item, idx) => {
            const isLoadingThis = selectedLoadingId === item.id;
            return (
              <div
                key={item.id + '_' + idx}
                onClick={() => !isLoadingThis && handleSelectItem(item)}
                className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all cursor-pointer group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 relative">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                      {type === 'video' ? <Video className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-100 line-clamp-1 group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {item.channel}
                  </p>
                </div>

                {/* Play Action Button */}
                <button
                  disabled={isLoadingThis}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-all flex-shrink-0 ${
                    type === 'video' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isLoadingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{isLoadingThis ? 'Memproses...' : 'Memutar'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
