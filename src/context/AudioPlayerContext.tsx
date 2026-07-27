import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useProfile } from './ProfileContext';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { CacheService } from '../services/CacheService';
import { apiClient } from '../api/client';

export interface JukeboxTrack {
  trackId: string;
  source?: string;
  videoId?: string;
  title: string;
  artist: string;
  thumbnail: string;
  downloadUrl: string;
  duration?: string;
  quality?: string;
  audioExpireAt?: number | null;
  isFavorite?: boolean;
  likedAt?: number;
  lastPlayedAt?: number;
}

interface AudioPlayerContextType {
  currentTrack: JukeboxTrack | null;
  playlist: JukeboxTrack[];
  favorites: JukeboxTrack[];
  history: JukeboxTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  miniPlayerMode: 'normal' | 'circle';
  isNotificationVisible: boolean;
  isNotificationFadingOut: boolean;
  
  // Actions
  playTrack: (track: JukeboxTrack, newPlaylist?: JukeboxTrack[]) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleFavorite: (track: JukeboxTrack) => Promise<boolean>;
  addToPlaylist: (track: JukeboxTrack) => Promise<boolean>;
  removeFromPlaylist: (trackId: string) => Promise<boolean>;
  setMiniPlayerMode: (mode: 'normal' | 'circle') => void;
  closeNotification: () => void;
  loadUserMusicData: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const userId = profile?.id || '#1';

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<JukeboxTrack | null>(null);
  const [playlist, setPlaylist] = useState<JukeboxTrack[]>([]);
  const [favorites, setFavorites] = useState<JukeboxTrack[]>([]);
  const [history, setHistory] = useState<JukeboxTrack[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [miniPlayerMode, setMiniPlayerMode] = useState<'normal' | 'circle'>('normal');
  const [isNotificationVisible, setIsNotificationVisible] = useState<boolean>(false);
  const [isNotificationFadingOut, setIsNotificationFadingOut] = useState<boolean>(false);

  // Initialize single persistent Audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsNotificationVisible(true);
      setIsNotificationFadingOut(false);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      // Auto-play next track in playlist if available
      nextTrackRef.current();
    };

    const onError = (e: Event) => {
      console.warn('[AUDIO PLAYER WARN] Audio playback error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Sync ref for nextTrack callback inside onEnded
  const nextTrackRef = useRef<() => void>(() => {});

  // Load User Music Data from D1 Database
  const loadUserMusicData = async () => {
    try {
      const [plData, favData, histData, lastData] = await Promise.all([
        D1DatabaseService.getJukeboxPlaylist(userId),
        D1DatabaseService.getJukeboxFavorites(userId),
        D1DatabaseService.getJukeboxHistory(userId),
        D1DatabaseService.getJukeboxLastPlayed(userId),
      ]);

      const mappedPlaylist: JukeboxTrack[] = (plData || []).map((item: any) => ({
        trackId: item.track_id || item.id,
        source: item.source || 'youtube',
        videoId: item.video_id || item.track_id || item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        downloadUrl: item.download_url,
        duration: item.duration,
        quality: item.quality,
        audioExpireAt: item.audio_expire_at || null,
        lastPlayedAt: item.last_played_at || null,
      }));

      const mappedFavorites: JukeboxTrack[] = (favData || []).map((item: any) => ({
        trackId: item.track_id || item.id,
        source: item.source || 'youtube',
        videoId: item.video_id || item.track_id || item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        downloadUrl: item.download_url,
        duration: item.duration,
        audioExpireAt: item.audio_expire_at || null,
        lastPlayedAt: item.last_played_at || null,
        isFavorite: true,
      }));

      const mappedHistory: JukeboxTrack[] = (histData || []).map((item: any) => ({
        trackId: item.track_id || item.id,
        source: item.source || 'youtube',
        videoId: item.video_id || item.track_id || item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        downloadUrl: item.download_url,
        duration: item.duration,
      }));

      setPlaylist(mappedPlaylist);
      setFavorites(mappedFavorites);
      setHistory(mappedHistory);

      // Pre-process Smart Center Crop for loaded thumbnails asynchronously
      [...mappedPlaylist, ...mappedFavorites].forEach((item) => {
        if (item.thumbnail) {
          CacheService.getSmartCroppedThumbnail(item.thumbnail).then((cropped) => {
            if (cropped) item.thumbnail = cropped;
          });
        }
      });

      // Restore last played track if available
      if (!currentTrack && lastData && (lastData.download_url || lastData.track_id)) {
        const lastTrack: JukeboxTrack = {
          trackId: lastData.track_id,
          source: lastData.source || 'youtube',
          videoId: lastData.video_id || lastData.track_id,
          title: lastData.title,
          artist: lastData.artist,
          thumbnail: lastData.thumbnail,
          downloadUrl: lastData.download_url,
          duration: lastData.duration,
          audioExpireAt: lastData.audio_expire_at || null,
        };
        if (lastTrack.thumbnail) {
          CacheService.getSmartCroppedThumbnail(lastTrack.thumbnail).then((cropped) => {
            if (cropped) {
              lastTrack.thumbnail = cropped;
              setCurrentTrack({ ...lastTrack });
            }
          });
        }
        setCurrentTrack(lastTrack);
        if (audioRef.current && lastTrack.downloadUrl) {
          audioRef.current.src = lastTrack.downloadUrl;
          if (lastData.progress && lastData.progress > 0) {
            audioRef.current.currentTime = lastData.progress;
          }
        }
      }
    } catch (err) {
      console.warn('[AUDIO PLAYER WARN] Error loading user music data from D1:', err);
    }
  };

  useEffect(() => {
    loadUserMusicData();
  }, [userId]);

  // Update Media Session API Metadata & Handlers
  useEffect(() => {
    if (!currentTrack) return;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Oguri Jukebox Track',
        artist: currentTrack.artist || 'Oguri Cap 🐎',
        album: 'Oguri Jukebox',
        artwork: [
          {
            src: currentTrack.thumbnail || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }

    // Cache metadata & thumbnail
    CacheService.cacheTrackMetadata({
      trackId: currentTrack.trackId,
      source: currentTrack.source,
      videoId: currentTrack.videoId,
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnail: currentTrack.thumbnail,
      downloadUrl: currentTrack.downloadUrl,
      duration: currentTrack.duration,
      audioExpireAt: currentTrack.audioExpireAt,
      cachedAt: Date.now(),
    });
  }, [currentTrack]);

  // Play Track Function
  const playTrack = async (track: JukeboxTrack, newPlaylist?: JukeboxTrack[]) => {
    if (!track) return;

    let activeTrack = { ...track };

    // Smart Center Crop thumbnail
    if (activeTrack.thumbnail) {
      try {
        const cropped = await CacheService.getSmartCroppedThumbnail(activeTrack.thumbnail);
        if (cropped) activeTrack.thumbnail = cropped;
      } catch (e) {}
    }

    const now = Date.now();
    const isExpired = activeTrack.audioExpireAt && Number(activeTrack.audioExpireAt) < now + 10000;

    // Check if downloadUrl missing or expired, auto fetch fresh URL
    if (!activeTrack.downloadUrl || isExpired) {
      const vId = activeTrack.videoId || activeTrack.trackId;
      if (vId) {
        try {
          const audioRes = await apiClient.getAudioDownload(vId);
          if (audioRes.success && audioRes.result?.download) {
            const freshUrl = audioRes.result.download;
            const freshExpire = now + 4 * 3600 * 1000; // 4 hours
            activeTrack.downloadUrl = freshUrl;
            activeTrack.audioExpireAt = freshExpire;

            D1DatabaseService.updateJukeboxTrackUrl({
              userId,
              trackId: activeTrack.trackId,
              downloadUrl: freshUrl,
              audioExpireAt: freshExpire,
              lastPlayedAt: now,
            });
          }
        } catch (err) {
          console.warn('[AUDIO REFRESH WARN] Failed to refresh audio URL:', err);
        }
      }
    }

    if (!activeTrack.downloadUrl) {
      console.warn('[AUDIO PLAYER WARN] No valid downloadUrl for track:', activeTrack.title);
      return;
    }

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }

    const isFav = favorites.some((f) => f.trackId === activeTrack.trackId);
    activeTrack.isFavorite = isFav;

    setCurrentTrack(activeTrack);
    setIsNotificationVisible(true);
    setIsNotificationFadingOut(false);

    if (audioRef.current) {
      audioRef.current.src = activeTrack.downloadUrl;
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;

      try {
        await audioRef.current.play();
        setIsPlaying(true);

        // Save play history to D1
        D1DatabaseService.addJukeboxHistory({
          userId,
          trackId: activeTrack.trackId,
          source: activeTrack.source || 'youtube',
          videoId: activeTrack.videoId || activeTrack.trackId,
          title: activeTrack.title,
          artist: activeTrack.artist,
          thumbnail: activeTrack.thumbnail,
          downloadUrl: activeTrack.downloadUrl,
          duration: activeTrack.duration,
        });

        // Also add to playlist in D1 if not present
        D1DatabaseService.addToJukeboxPlaylist({
          userId,
          trackId: activeTrack.trackId,
          source: activeTrack.source || 'youtube',
          videoId: activeTrack.videoId || activeTrack.trackId,
          title: activeTrack.title,
          artist: activeTrack.artist,
          thumbnail: activeTrack.thumbnail,
          downloadUrl: activeTrack.downloadUrl,
          duration: activeTrack.duration,
          quality: activeTrack.quality,
          audioExpireAt: activeTrack.audioExpireAt,
          lastPlayedAt: now,
        });

        // Save last played
        D1DatabaseService.saveJukeboxLastPlayed({
          userId,
          trackId: activeTrack.trackId,
          source: activeTrack.source || 'youtube',
          videoId: activeTrack.videoId || activeTrack.trackId,
          title: activeTrack.title,
          artist: activeTrack.artist,
          thumbnail: activeTrack.thumbnail,
          downloadUrl: activeTrack.downloadUrl,
          duration: activeTrack.duration,
          progress: 0,
          audioExpireAt: activeTrack.audioExpireAt,
        });
      } catch (err) {
        console.warn('[AUDIO PLAYER WARN] Auto-play error, attempting live URL refresh:', err);
        const vId = activeTrack.videoId || activeTrack.trackId;
        if (vId) {
          try {
            const freshRes = await apiClient.getAudioDownload(vId);
            if (freshRes.success && freshRes.result?.download) {
              const freshUrl = freshRes.result.download;
              const freshExpire = Date.now() + 4 * 3600 * 1000;
              activeTrack.downloadUrl = freshUrl;
              activeTrack.audioExpireAt = freshExpire;

              audioRef.current.src = freshUrl;
              await audioRef.current.play();
              setIsPlaying(true);

              D1DatabaseService.updateJukeboxTrackUrl({
                userId,
                trackId: activeTrack.trackId,
                downloadUrl: freshUrl,
                audioExpireAt: freshExpire,
                lastPlayedAt: Date.now(),
              });
              return;
            }
          } catch (e) {}
        }
        setIsPlaying(false);
      }
    }
  };

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);

      // Save progress to D1 on pause
      D1DatabaseService.saveJukeboxLastPlayed({
        userId,
        trackId: currentTrack.trackId,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
        downloadUrl: currentTrack.downloadUrl,
        duration: currentTrack.duration,
        progress: audioRef.current.currentTime,
      });
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn('Play error:', e));
    }
  };

  // Next Track
  const nextTrack = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((t) => t.trackId === currentTrack.trackId);
    let nextIndex = 0;
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      nextIndex = currentIndex + 1;
    }
    const nextItem = playlist[nextIndex];
    if (nextItem) {
      playTrack(nextItem);
    }
  };

  nextTrackRef.current = nextTrack;

  // Previous Track
  const prevTrack = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((t) => t.trackId === currentTrack.trackId);
    let prevIndex = playlist.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    const prevItem = playlist[prevIndex];
    if (prevItem) {
      playTrack(prevItem);
    }
  };

  // Seek
  const seek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  // Volume
  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  // Mute
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  // Toggle Favorite
  const toggleFavorite = async (track: JukeboxTrack): Promise<boolean> => {
    if (!track || !track.trackId) return false;

    let targetTrack = { ...track };
    if (targetTrack.thumbnail) {
      try {
        const cropped = await CacheService.getSmartCroppedThumbnail(targetTrack.thumbnail);
        if (cropped) targetTrack.thumbnail = cropped;
      } catch (e) {}
    }

    const res = await D1DatabaseService.toggleJukeboxFavorite({
      userId,
      trackId: targetTrack.trackId,
      source: targetTrack.source || 'youtube',
      videoId: targetTrack.videoId || targetTrack.trackId,
      title: targetTrack.title,
      artist: targetTrack.artist,
      thumbnail: targetTrack.thumbnail,
      downloadUrl: targetTrack.downloadUrl,
      duration: targetTrack.duration,
      audioExpireAt: targetTrack.audioExpireAt,
      lastPlayedAt: targetTrack.lastPlayedAt || Date.now(),
    });

    if (res.success) {
      if (res.isFavorite) {
        // Add to local favorites
        const favTrack = { ...targetTrack, isFavorite: true };
        setFavorites((prev) => [favTrack, ...prev.filter((f) => f.trackId !== targetTrack.trackId)]);
        
        // Auto add to Playlist if not present
        if (!playlist.some((p) => p.trackId === targetTrack.trackId)) {
          setPlaylist((prev) => [favTrack, ...prev]);
          D1DatabaseService.addToJukeboxPlaylist({
            userId,
            trackId: targetTrack.trackId,
            source: targetTrack.source || 'youtube',
            videoId: targetTrack.videoId || targetTrack.trackId,
            title: targetTrack.title,
            artist: targetTrack.artist,
            thumbnail: targetTrack.thumbnail,
            downloadUrl: targetTrack.downloadUrl,
            duration: targetTrack.duration,
            audioExpireAt: targetTrack.audioExpireAt,
            lastPlayedAt: Date.now(),
          });
        }
      } else {
        // Remove from local favorites
        setFavorites((prev) => prev.filter((f) => f.trackId !== targetTrack.trackId));
      }

      // Sync current track favorite state
      if (currentTrack && currentTrack.trackId === targetTrack.trackId) {
        setCurrentTrack((prev) => (prev ? { ...prev, isFavorite: res.isFavorite } : prev));
      }
    }

    return res.isFavorite;
  };

  // Add to Playlist
  const addToPlaylist = async (track: JukeboxTrack): Promise<boolean> => {
    let targetTrack = { ...track };
    if (targetTrack.thumbnail) {
      try {
        const cropped = await CacheService.getSmartCroppedThumbnail(targetTrack.thumbnail);
        if (cropped) targetTrack.thumbnail = cropped;
      } catch (e) {}
    }

    const ok = await D1DatabaseService.addToJukeboxPlaylist({
      userId,
      trackId: targetTrack.trackId,
      source: targetTrack.source || 'youtube',
      videoId: targetTrack.videoId || targetTrack.trackId,
      title: targetTrack.title,
      artist: targetTrack.artist,
      thumbnail: targetTrack.thumbnail,
      downloadUrl: targetTrack.downloadUrl,
      duration: targetTrack.duration,
      quality: targetTrack.quality,
      audioExpireAt: targetTrack.audioExpireAt,
      lastPlayedAt: targetTrack.lastPlayedAt || Date.now(),
    });
    if (ok) {
      setPlaylist((prev) => {
        if (prev.some((p) => p.trackId === targetTrack.trackId)) return prev;
        return [targetTrack, ...prev];
      });
    }
    return ok;
  };

  // Remove from Playlist
  const removeFromPlaylist = async (trackId: string): Promise<boolean> => {
    const ok = await D1DatabaseService.removeFromJukeboxPlaylist(userId, trackId);
    if (ok) {
      setPlaylist((prev) => prev.filter((p) => p.trackId !== trackId));
    }
    return ok;
  };

  // Close Media Notification with 4-second fade out animation
  const closeNotification = () => {
    setIsNotificationFadingOut(true);
    setTimeout(() => {
      setIsNotificationVisible(false);
      setIsNotificationFadingOut(false);
    }, 4000); // 4 seconds fade out
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        playlist,
        favorites,
        history,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        miniPlayerMode,
        isNotificationVisible,
        isNotificationFadingOut,

        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleFavorite,
        addToPlaylist,
        removeFromPlaylist,
        setMiniPlayerMode,
        closeNotification,
        loadUserMusicData,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
