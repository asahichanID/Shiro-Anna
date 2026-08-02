import React, { useState, useEffect, useRef } from 'react';
import { Video, Music, X, RefreshCw, Sparkles, Loader2, Disc } from 'lucide-react';
import { NobarMedia } from '../../services/NobarService';
import { BOT_DEFAULT_AVATAR } from '../../config/constants';
import { apiClient } from '../../api/client';

interface NobarPlayerProps {
  media: NobarMedia | null;
  onStopMedia: () => void;
}

export const NobarPlayer: React.FC<NobarPlayerProps> = ({ media, onStopMedia }) => {
  const [useCdnFallback, setUseCdnFallback] = useState(false);
  const [cdnStreamUrl, setCdnStreamUrl] = useState<string | null>(null);
  const [isFetchingCdn, setIsFetchingCdn] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset fallback states when media changes
  useEffect(() => {
    setUseCdnFallback(false);
    setCdnStreamUrl(null);
    setIsFetchingCdn(false);
  }, [media?.id]);

  // Handler for CDN Fallback resolution if embed fails
  const handleFetchCdnFallback = async () => {
    if (!media) return;
    setIsFetchingCdn(true);
    try {
      if (media.type === 'video' && (ytVideoId || media.videoId)) {
        const targetId = ytVideoId || media.videoId || media.url;
        const res = await apiClient.getVideoDownload(targetId, '720');
        if (res.success && res.result?.download) {
          setCdnStreamUrl(res.result.download);
          setUseCdnFallback(true);
        } else {
          // Try audio download fallback
          const audioRes = await apiClient.getAudioDownload(targetId);
          if (audioRes.success && audioRes.result?.download) {
            setCdnStreamUrl(audioRes.result.download);
            setUseCdnFallback(true);
          }
        }
      } else {
        const query = media.title + ' ' + (media.artistOrChannel || '');
        const audioRes = await apiClient.getAudioDownload(media.url || query);
        if (audioRes.success && audioRes.result?.download) {
          setCdnStreamUrl(audioRes.result.download);
          setUseCdnFallback(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch CDN fallback:', err);
    } finally {
      setIsFetchingCdn(false);
    }
  };

  if (!media) {
    return null;
  }

  // Extract YouTube video ID if available
  const extractYouTubeId = (url: string, videoId?: string) => {
    if (videoId && videoId.length === 11 && !videoId.includes('/')) return videoId;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const ytVideoId = extractYouTubeId(media.url, media.videoId) || extractYouTubeId(media.sourceUrl || '', undefined);
  const isMusic = media.type === 'music' || media.source === 'spotify' || !ytVideoId;

  return (
    <div className="w-full relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl mb-4 transition-all duration-500 animate-slideDown">
      {/* Top Banner Info */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-slate-800 text-xs text-slate-300 gap-2">
        <div className="flex items-center space-x-2.5 truncate max-w-[70%]">
          <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className={`font-extrabold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 border ${
            isMusic 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/20 border-red-500/30 text-red-300'
          }`}>
            {isMusic ? <Disc className="w-3 h-3 text-emerald-400" /> : <Video className="w-3 h-3 text-red-400" />}
            {isMusic ? (media.source === 'spotify' ? 'Spotify Music' : 'YouTube Music') : 'YouTube Video'}
          </span>
          <span className="font-bold text-slate-100 truncate">{media.title}</span>
          {media.artistOrChannel && (
            <span className="text-slate-400 truncate hidden sm:inline">• {media.artistOrChannel}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* CDN Fallback button */}
          {!useCdnFallback && (
            <button
              onClick={handleFetchCdnFallback}
              disabled={isFetchingCdn}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
              title="Gunakan Server CDN jika media tidak dapat diputar"
            >
              {isFetchingCdn ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span className="hidden sm:inline">Coba Stream CDN</span>
            </button>
          )}

          {/* Played By User Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px]">
            <img
              src={media.playedByAvatar || BOT_DEFAULT_AVATAR}
              alt={media.playedBy}
              className="w-4 h-4 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
              }}
            />
            <span className="text-slate-300 font-medium truncate max-w-[100px]">{media.playedBy}</span>
          </div>

          {/* Stop Media Button */}
          <button
            onClick={onStopMedia}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
            title="Hentikan Nobar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Player Container */}
      <div className="relative w-full min-h-[220px] max-h-[380px] bg-black flex items-center justify-center overflow-hidden">
        {/* CDN Fallback Video or Audio */}
        {useCdnFallback && cdnStreamUrl ? (
          <div className="w-full h-full bg-black flex items-center justify-center p-2">
            {!isMusic ? (
              <video
                ref={videoRef}
                src={cdnStreamUrl}
                autoPlay
                controls
                className="w-full max-h-[320px] object-contain"
              />
            ) : (
              <div className="w-full max-w-xl p-6 bg-gradient-to-br from-slate-900 via-emerald-950/60 to-slate-900 rounded-2xl border border-emerald-500/30 flex flex-col items-center gap-4 text-center">
                <img
                  src={media.thumbnail || BOT_DEFAULT_AVATAR}
                  alt={media.title}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
                  }}
                />
                <div>
                  <h3 className="text-base font-extrabold text-white">{media.title}</h3>
                  <p className="text-xs text-emerald-300 font-medium">{media.artistOrChannel || 'Spotify Track'}</p>
                </div>
                <audio
                  ref={audioRef}
                  src={cdnStreamUrl}
                  autoPlay
                  controls
                  className="w-full h-11 rounded-xl bg-slate-900 border border-emerald-500/40"
                />
              </div>
            )}
          </div>
        ) : isMusic ? (
          /* Spotify-Style Music Player Card for Spotify and YouTube Music */
          <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Blurred Artwork Backdrop */}
            {media.thumbnail && (
              <img
                src={media.thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-2xl pointer-events-none scale-125"
              />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 max-w-xl w-full">
              {/* Album Cover Art */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/20 flex-shrink-0 bg-slate-900 relative group">
                <img
                  src={media.thumbnail || BOT_DEFAULT_AVATAR}
                  alt={media.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                  <Music className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Track Metadata & Audio Player */}
              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <Disc className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                    {media.source === 'spotify' ? 'Spotify Premium Audio' : 'YouTube Music Audio'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white line-clamp-1 drop-shadow-md">
                  {media.title}
                </h3>
                <p className="text-xs font-bold text-slate-300 line-clamp-1">
                  {media.artistOrChannel || 'Spotify Artist'}
                </p>

                {/* HTML5 Audio Player for Direct Streams OR Embedded YouTube Audio */}
                {ytVideoId && (!media.url || media.url.includes('youtube.com') || media.url.includes('youtu.be')) ? (
                  <div className="mt-3 w-full h-12 rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900/90 shadow-inner">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&rel=0`}
                      title={media.title}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                ) : (
                  <audio
                    ref={audioRef}
                    src={media.url}
                    autoPlay
                    controls
                    className="w-full h-11 mt-3 rounded-xl accent-emerald-500 bg-slate-900/90 border border-emerald-500/30 shadow-inner"
                  />
                )}
              </div>
            </div>
          </div>
        ) : ytVideoId ? (
          /* Standard Clean YouTube Video Embed */
          <div className="w-full flex flex-col items-center">
            <iframe
              src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&rel=0&enablejsapi=1`}
              title={media.title}
              className="w-full h-[280px] sm:h-[320px] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            {/* Quick Helper Bar for Restricted Videos */}
            <div className="w-full px-4 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">
                💡 Jika video tidak bisa diputar (restriksi hak cipta YouTube), gunakan tombol CDN atau tonton langsung.
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${ytVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 flex-shrink-0 hover:underline"
              >
                Tonton di YouTube ↗
              </a>
            </div>
          </div>
        ) : (
          /* Direct Video / Generic Media Fallback */
          <video
            ref={videoRef}
            src={media.url}
            autoPlay
            controls
            className="w-full max-h-[300px] object-contain"
          />
        )}
      </div>
    </div>
  );
};

