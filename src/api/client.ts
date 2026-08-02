/**
 * Centralized API Client for Oguri Cap Web App
 * Communicates strictly with Cloudflare Worker API Gateway:
 * Base URL: https://shiroapi.shiroanna.workers.dev
 */

export const WORKER_BASE_URL = 'https://shiroapi.shiroanna.workers.dev';

export interface ApiResponse<T = any> {
  success: boolean;
  provider?: string;
  cached?: boolean;
  result?: T;
  message?: string;
  code?: string;
}

export interface SearchItem {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  publishTime?: string;
  description?: string;
  source?: 'youtube' | 'spotify';
  id?: string;
  uri?: string;
  type?: string;
  spotifyUrl?: string;
  artists?: string;
  album?: string;
  durationMs?: number;
  playability?: string;
  matchedFields?: string[];
}

export interface MediaDownloadResult {
  title?: string;
  url?: string;
  download?: string;
  link?: string;
  thumbnail?: string;
  duration?: string;
  quality?: string;
  size?: string;
  format?: string;
  [key: string]: any;
}


function stringifySpotifyText(val: any, fallback = ''): string {
  if (val == null) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (Array.isArray(val)) {
    const parts = val.map((v) => stringifySpotifyText(v, '')).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.text === 'string') return val.text;
    if (typeof val.artist === 'string') return val.artist;
    if (typeof val.url === 'string') return val.url;
  }
  return fallback;
}

function getSpotifyImageUrl(item: any): string {
  if (!item || typeof item !== 'object') return '';
  const candidates = [
    item.thumbnail,
    item.cover,
    item.image,
    item.artwork,
    item.artwork_url,
    item.image_url,
    item.cover_url,
    item.album?.images?.[0]?.url,
    item.images?.[0]?.url,
    item.sixteen_by_nine_cover?.[0]?.url,
    item.album?.cover?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return '';
}

function normalizeSpotifyArtistList(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    const list = val
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') {
          return v.name || v.title || v.artist || '';
        }
        return '';
      })
      .filter(Boolean);
    return list.join(', ');
  }
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
  }
  return '';
}

function normalizeSpotifySearchItem(item: any): SearchItem | null {
  if (!item || typeof item !== 'object') return null;

  const spotifyId =
    typeof item.id === 'string'
      ? item.id
      : typeof item.uri === 'string'
        ? item.uri.split(':').pop() || ''
        : '';

  const spotifyUrl =
    typeof item.url === 'string' && item.url
      ? item.url
      : typeof item.link === 'string' && item.link
        ? item.link
        : typeof item.external_urls?.spotify === 'string'
          ? item.external_urls.spotify
          : '';

  const title =
    stringifySpotifyText(item.name || item.title || item.track || item.song || item.track_name, 'Spotify Track') ||
    'Spotify Track';

  const artists = normalizeSpotifyArtistList(item.artists || item.artist || item.artist_name || item.channel || item.owner);

  const albumName = stringifySpotifyText(item.album?.name || item.album_name || item.albumName, '');
  const thumbnail = getSpotifyImageUrl(item);

  const durationMs =
    typeof item.duration_ms === 'number'
      ? item.duration_ms
      : typeof item.durationMs === 'number'
        ? item.durationMs
        : typeof item.length === 'number'
          ? item.length
          : undefined;

  const playability =
    typeof item.playability?.reason === 'string'
      ? item.playability.reason
      : typeof item.playability === 'string'
        ? item.playability
        : '';

  const matchedFields = Array.isArray(item.matched_fields)
    ? item.matched_fields.map((v: any) => stringifySpotifyText(v, '')).filter(Boolean)
    : [];

  return {
    source: 'spotify',
    videoId: spotifyId || item.videoId || spotifyUrl || title,
    id: spotifyId,
    uri: typeof item.uri === 'string' ? item.uri : '',
    type: typeof item.type === 'string' ? item.type : '',
    url: spotifyUrl,
    spotifyUrl,
    title,
    channel: artists || albumName || 'Spotify Artist',
    artists,
    album: albumName,
    thumbnail,
    duration: durationMs ? `${Math.round(durationMs / 1000)}s` : item.duration || '',
    durationMs,
    description: stringifySpotifyText(item.description || item.lyrics || '', ''),
    playability,
    matchedFields,
    publishTime: stringifySpotifyText(item.publishTime || item.release_date || '', ''),
  };
}

function collectUniqueSpotifyItems(items: any[]): SearchItem[] {
  const seen = new Set<string>();
  const out: SearchItem[] = [];

  for (const item of items) {
    const normalized = normalizeSpotifySearchItem(item);
    if (!normalized) continue;

    const key =
      normalized.id ||
      normalized.uri ||
      normalized.spotifyUrl ||
      `${normalized.title}::${normalized.channel}`.toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
}

class ApiClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTtlMs: number;

  constructor(baseUrl: string = WORKER_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.cache = new Map();
    this.cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Internal HTTP Request Helper with Timeout, AbortController, Auto-Retry & In-Memory Cache
   */
  private async request<T = any>(
    endpoint: string,
    params: Record<string, string> = {},
    options: { timeoutMs?: number; retryCount?: number; useCache?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const { timeoutMs = 15000, retryCount = 1, useCache = true } = options;

    // Build URL query string
    const queryParts: string[] = [];
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const fullUrl = `${this.baseUrl}${endpoint}${queryString}`;

    // Cache lookup
    if (useCache && this.cache.has(fullUrl)) {
      const cached = this.cache.get(fullUrl)!;
      if (Date.now() - cached.timestamp < this.cacheTtlMs) {
        return {
          success: true,
          cached: true,
          result: cached.data,
        };
      } else {
        this.cache.delete(fullUrl);
      }
    }

    let lastErrorMsg = 'Terjadi kesalahan saat menghubungi API Server.';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timer);

        const responseText = await response.text();
        let jsonPayload: any = null;

        try {
          jsonPayload = JSON.parse(responseText);
        } catch {
          throw new Error(`Respon dari server tidak valid (Format non-JSON).`);
        }

        if (!response.ok) {
          const errMsg =
            jsonPayload?.message ||
            jsonPayload?.error ||
            `Server mengembalikan HTTP Status ${response.status}`;
          throw new Error(errMsg);
        }

        if (
          jsonPayload &&
          (jsonPayload.success === false ||
            jsonPayload.status === false ||
            jsonPayload.status === 'error' ||
            jsonPayload.code === 400 ||
            jsonPayload.code === 500)
        ) {
          const errMsg =
            jsonPayload?.message ||
            jsonPayload?.error ||
            jsonPayload?.msg ||
            'API Worker mengembalikan status error.';
          throw new Error(errMsg);
        }

        const normalizedResponse: ApiResponse<T> = {
          success: true,
          provider: jsonPayload?.provider || 'shiroapi',
          result: jsonPayload?.result !== undefined ? jsonPayload.result : jsonPayload,
        };

        // Cache successful response data
        if (useCache && normalizedResponse.result !== undefined) {
          this.cache.set(fullUrl, { data: normalizedResponse.result, timestamp: Date.now() });
        }

        return normalizedResponse;
      } catch (err: any) {
        clearTimeout(timer);

        if (err.name === 'AbortError') {
          lastErrorMsg = 'Waktu koneksi ke API Server habis (Timeout). Silakan coba lagi.';
        } else {
          lastErrorMsg = err.message || 'Gagal tersambung ke API Gateway.';
        }

        // Wait before retry
        if (attempt < retryCount) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    }

    return {
      success: false,
      message: lastErrorMsg,
      code: 'API_REQUEST_FAILED',
    };
  }

  /**
   * Search YouTube videos using Neoxr YTS API (used specifically in Nobar)
   */
  public async searchYouTubeNeoxr(query: string): Promise<ApiResponse<SearchItem[]>> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'Kata kunci pencarian tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    try {
      const apiUrl = `https://api.neoxr.eu/api/yts?q=${encodeURIComponent(trimmed)}&apikey=j3i3mg`;
      const res = await fetch(apiUrl);
      const json = await res.json();

      if (json && json.status && Array.isArray(json.data) && json.data.length > 0) {
        const items: SearchItem[] = json.data
          .filter((item: any) => item && (item.type === 'video' || item.videoId))
          .map((item: any) => ({
            id: item.videoId || Math.random().toString(36).substring(2),
            title: item.title || 'YouTube Video',
            channel: item.author?.name || 'YouTube',
            thumbnail: item.thumbnail || item.image || (item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : ''),
            url: item.url || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : ''),
            videoId: item.videoId,
          }));

        if (items.length > 0) {
          return { success: true, result: items };
        }
      }
    } catch (err) {
      console.warn('Neoxr YTS search error, falling back to standard worker:', err);
    }

    // Fallback to primary worker search
    return this.searchYouTube(trimmed);
  }

  /**
   * Search YouTube videos via Worker (/search?query=)
   */
  public async searchYouTube(query: string): Promise<ApiResponse<SearchItem[]>> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'Kata kunci pencarian tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    // Send both query and q parameters along with region/lang parameters for accurate localized results
    let response = await this.request('/search', {
      query: trimmed,
      q: trimmed,
      gl: 'ID',
      hl: 'id',
      region: 'ID',
      lang: 'id',
    });

    if (!response.success) {
      // Try secondary endpoint if /search failed
      response = await this.request('/spotify', { query: trimmed });
    }

    const payload = response.result !== undefined ? response.result : response;
    
    // Recursive item extractor
    const extractItems = (obj: any, depth = 4): any[] => {
      if (!obj || depth <= 0) return [];
      if (typeof obj === 'string') {
        try {
          return extractItems(JSON.parse(obj), depth - 1);
        } catch {
          return [];
        }
      }
      if (Array.isArray(obj)) {
        return obj;
      }
      if (typeof obj === 'object') {
        const keys = ['items', 'result', 'results', 'data', 'videos', 'tracks', 'content', 'list', 'search', 'response'];
        for (const k of keys) {
          if (obj[k]) {
            const res = extractItems(obj[k], depth - 1);
            if (res.length > 0) return res;
          }
        }
        for (const k of Object.keys(obj)) {
          if (obj[k] && typeof obj[k] === 'object') {
            const res = extractItems(obj[k], depth - 1);
            if (res.length > 0) return res;
          }
        }
      }
      return [];
    };

    let rawItems = extractItems(payload);

    if (!rawItems || rawItems.length === 0) {
      if (payload && typeof payload === 'object' && (payload.videoId || payload.id || payload.title || payload.url || payload.name)) {
        rawItems = [payload];
      }
    }

    // Fallback item if worker returned empty for a valid query string
    if (!rawItems || rawItems.length === 0) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      const fallbackItem: SearchItem = {
        videoId: '',
        url: searchUrl,
        title: `${trimmed} (Pencarian YouTube)`,
        channel: 'YouTube Video',
        thumbnail: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        description: `Hasil pencarian untuk "${trimmed}". Klik Audio atau Video untuk mengunduh via Worker.`,
        duration: 'YouTube',
      };

      return {
        success: true,
        provider: response.provider || 'shiroapi',
        cached: response.cached,
        result: [fallbackItem],
      };
    }

    const items: SearchItem[] = rawItems.slice(0, 30).map((item: any) => {
      const videoId =
        item.videoId ||
        item.id?.videoId ||
        (typeof item.id === 'string' ? item.id : '') ||
        '';

      let url = item.url || item.link || item.webpage_url || '';
      if (!url && videoId) {
        url = `https://www.youtube.com/watch?v=${videoId}`;
      }

      const title = item.title || item.name || item.snippet?.title || 'Unknown Title';
      const channel =
        item.channel ||
        item.author?.name ||
        item.author ||
        item.snippet?.channelTitle ||
        item.uploader ||
        'YouTube Channel';

      const publishTime =
        item.publishTime ||
        item.publishedAt ||
        item.snippet?.publishTime ||
        item.ago ||
        '';

      const description =
        item.description ||
        item.snippet?.description ||
        '';

      const thumbnail =
        item.thumbnail ||
        item.image ||
        item.cover ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

      const duration = item.duration || item.timestamp || item.time || '';

      return {
        videoId,
        url,
        title,
        channel,
        thumbnail,
        publishTime,
        description,
        duration,
      };
    });

    return {
      success: true,
      provider: response.provider || 'shiroapi',
      cached: response.cached,
      result: items,
    };
  }

  /**
   * Check if a URL is a valid playable audio/media stream URL
   * and NOT a Spotify/YouTube/TikTok webpage or non-media string.
   */
  private isAudioStreamUrl(url: any): boolean {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    // Exclude webpage / non-direct-stream domains
    if (/spotify\.com|spotify:|youtube\.com|youtu\.be|tiktok\.com\/@|vt\.tiktok\.com|vm\.tiktok\.com|www\.tiktok\.com/i.test(trimmed)) return false;
    return true;
  }

  /**
   * Helper to extract download link from various response shapes
   */
  private extractDownloadUrl(payload: any, depth = 8): string {
    if (payload == null || depth <= 0) {
      return '';
    }

    if (typeof payload === 'string') {
      const value = payload.trim();
      if (this.isAudioStreamUrl(value)) {
        return value;
      }
      return '';
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        const found = this.extractDownloadUrl(item, depth - 1);
        if (found) {
          return found;
        }
      }
      return '';
    }

    if (typeof payload !== 'object') {
      return '';
    }

    /*
     * Prioritaskan field yang memang biasanya berisi
     * media/download URL.
     */
    const directKeys = [
      'play',
      'hdplay',
      'wmplay',
      'nowatermark',
      'no_watermark',
      'nowm',
      'nowatermark_hd',
      'video',
      'video_url',
      'videoUrl',
      'video_hd',
      'music',
      'music_url',
      'download',
      'download_url',
      'downloadUrl',
      'audio',
      'audio_url',
      'audioUrl',
      'mp3',
      'mp3_url',
      'mp3Url',
      'preview_url',
      'previewUrl',
      'stream',
      'stream_url',
      'streamUrl',
      'media',
      'media_url',
      'mediaUrl',
      'link_audio',
      'audio_link',
      'linkAudio',
      'file',
      'file_url',
      'fileUrl',
      'src',
      'path',
      'link',
      'href',
      'url',
    ];

    for (const key of directKeys) {
      const value = payload[key];
      if (typeof value === 'string' && this.isAudioStreamUrl(value)) {
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        const found = this.extractDownloadUrl(value, depth - 1);
        if (found) return found;
      }
    }

    /*
     * Beberapa API membungkus response:
     * result.data
     * result.data.result
     * result.response
     * dst.
     */
    const nestedKeys = [
      'result',
      'data',
      'response',
      'info',
      'item',
      'track',
      'media',
      'formats',
      'format',
    ];

    for (const key of nestedKeys) {
      if (payload[key] !== undefined && payload[key] !== null) {
        const found = this.extractDownloadUrl(
          payload[key],
          depth - 1
        );

        if (found) {
          return found;
        }
      }
    }

    return '';
  }
  /**
   * Helper to normalize YouTube URL/ID parameters
   */
  private prepareMediaParams(urlOrId: string, extraParams: Record<string, string> = {}): Record<string, string> {
    const trimmed = urlOrId.trim();
    const params: Record<string, string> = { ...extraParams };

    let videoId = '';

    // Regex to match YouTube video ID from watch?v=, shorts/, embed/, youtu.be/, etc.
    const ytReg = /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = trimmed.match(ytReg);

    if (match && match[1]) {
      videoId = match[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      videoId = trimmed;
    } else {
      // Fallback: look for any 11-character alphanumeric block
      const m2 = trimmed.match(/([a-zA-Z0-9_-]{11})/);
      if (m2 && m2[1]) {
        videoId = m2[1];
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      params.id = videoId;
    } else {
      params.url = trimmed;
    }

    return params;
  }

  /**
   * Get Audio (MP3) download information via Worker (/audio?id=)
   * Includes automatic fallback to secondary APIs if Worker response lacks media URL.
   */
  public async getAudioDownload(urlOrId: string): Promise<ApiResponse<MediaDownloadResult>> {
    const trimmed = urlOrId.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'URL atau ID video tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    const params = this.prepareMediaParams(trimmed);
    const videoId = params.id || '';
    const fullVideoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : trimmed;

    const response = await this.request<MediaDownloadResult>('/audio', params);

    const payload = response.result !== undefined ? response.result : response;
    let extractedUrl = this.extractDownloadUrl(payload);

    // If Worker API returned a valid media stream, return it
    if (extractedUrl) {
      const resultObj: MediaDownloadResult =
        typeof payload === 'object' && payload !== null ? { ...payload } : {};

      resultObj.download = extractedUrl || resultObj.download || resultObj.url || resultObj.link || '';
      resultObj.url = extractedUrl || resultObj.url || '';

      return {
        success: true,
        provider: response.provider || 'shiroapi',
        cached: response.cached,
        result: resultObj,
      };
    }

    // Fallback Attempt 1: Neoxr YouTube Audio API
    try {
      const fallbackRes = await fetch(
        `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(fullVideoUrl)}&type=audio&quality=128kbps&apikey=j3i3mg`
      );
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const fallbackMediaUrl =
          fallbackJson?.data?.url || fallbackJson?.url || fallbackJson?.result?.download || '';

        if (fallbackMediaUrl && this.isAudioStreamUrl(fallbackMediaUrl)) {
          return {
            success: true,
            provider: 'neoxr-audio-fallback',
            result: {
              title: fallbackJson.title || fallbackJson.data?.filename || 'YouTube Audio',
              download: fallbackMediaUrl,
              url: fallbackMediaUrl,
              thumbnail:
                fallbackJson.thumbnail ||
                (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
              duration: fallbackJson.duration || '',
            },
          };
        }
      }
    } catch (e) {
      // Fallback 1 error
    }

    return {
      success: false,
      provider: response.provider,
      cached: response.cached,
      message: 'API tidak memberikan link media yang bisa diputar.',
      code: 'MEDIA_URL_MISSING',
    };
  }

  /**
   * Get Video (MP4) download information via Worker (/video?id=&quality=720)
   * Ensures quality mapping format: "360", "480", "720", "1080", "1440", "2k"
   * Includes automatic fallback to secondary APIs if Worker response lacks media URL.
   */
  public async getVideoDownload(
    urlOrId: string,
    quality: string = '720'
  ): Promise<ApiResponse<MediaDownloadResult>> {
    const trimmed = urlOrId.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'URL atau ID video tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    // Map UI quality values ("360p", "480p", "720p", "1080p", "1440p", "2K") to backend formats ("360", "480", "720", "1080", "1440", "2k")
    let rawQuality = String(quality || '720').trim().toLowerCase();
    if (rawQuality.endsWith('p')) {
      rawQuality = rawQuality.slice(0, -1);
    }
    if (rawQuality === '2k' || rawQuality === '2k') {
      rawQuality = '2k';
    }

    const params = this.prepareMediaParams(trimmed, { quality: rawQuality });
    const videoId = params.id || '';
    const fullVideoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : trimmed;

    const response = await this.request<MediaDownloadResult>('/video', params);

    const payload = response.result !== undefined ? response.result : response;
    let extractedUrl = this.extractDownloadUrl(payload);

    // If Worker API returned a valid media stream, return it
    if (extractedUrl) {
      const resultObj: MediaDownloadResult =
        typeof payload === 'object' && payload !== null ? { ...payload } : {};

      resultObj.download = extractedUrl || resultObj.download || resultObj.url || resultObj.link || '';
      resultObj.url = extractedUrl || resultObj.url || '';
      resultObj.quality = rawQuality === '2k' ? '2K' : `${rawQuality}p`;

      return {
        success: true,
        provider: response.provider || 'shiroapi',
        cached: response.cached,
        result: resultObj,
      };
    }

    // Fallback Attempt 1: Neoxr YouTube Video API
    try {
      const fallbackRes = await fetch(
        `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(fullVideoUrl)}&type=video&quality=${rawQuality}p&apikey=j3i3mg`
      );
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const fallbackMediaUrl =
          fallbackJson?.data?.url || fallbackJson?.url || fallbackJson?.result?.download || '';

        if (fallbackMediaUrl && this.isAudioStreamUrl(fallbackMediaUrl)) {
          return {
            success: true,
            provider: 'neoxr-video-fallback',
            result: {
              title: fallbackJson.title || fallbackJson.data?.filename || 'YouTube Video',
              download: fallbackMediaUrl,
              url: fallbackMediaUrl,
              quality: rawQuality === '2k' ? '2K' : `${rawQuality}p`,
              thumbnail:
                fallbackJson.thumbnail ||
                (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
              duration: fallbackJson.duration || '',
            },
          };
        }
      }
    } catch (e) {
      // Fallback 1 error
    }

    return {
      success: false,
      provider: response.provider,
      cached: response.cached,
      message: 'API tidak memberikan link media yang bisa diputar.',
      code: 'MEDIA_URL_MISSING',
    };
  }

  /**
   * Download TikTok video/audio info via Worker (/tiktok?url=)
   * Includes multi-endpoint fallbacks (TikWM, etc.) to guarantee playable video extraction.
   */
  public async getTikTokDownload(tiktokUrl: string): Promise<ApiResponse<MediaDownloadResult>> {
    const trimmed = tiktokUrl.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'URL TikTok tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    // 1. Backend Server TikTok Engine (with HTTP validation & Proxy support)
    try {
      const serverRes = await fetch(`/api/v1/tiktok/download?url=${encodeURIComponent(trimmed)}`);
      if (serverRes.ok) {
        const serverJson = await serverRes.json();
        if (serverJson.success && serverJson.result) {
          const resObj = serverJson.result;
          const validDownloadUrl = resObj.download || resObj.url || resObj.proxyUrl || '';
          if (validDownloadUrl) {
            return {
              success: true,
              provider: 'tiktok-server-engine',
              result: {
                ...resObj,
                download: validDownloadUrl,
                url: validDownloadUrl,
                proxyUrl: resObj.proxyUrl || `/api/v1/proxy-media?url=${encodeURIComponent(validDownloadUrl)}`,
                fallbackUrls: resObj.fallbackUrls || [
                  `/api/v1/proxy-media?url=${encodeURIComponent(validDownloadUrl)}`,
                ],
              },
            };
          }
        }
      }
    } catch (e) {
      // Server engine fallback
    }

    // 2. Primary Attempt: Cloudflare Worker API Gateway
    try {
      const response = await this.request<MediaDownloadResult>('/tiktok', { url: trimmed });
      const payload = response.result !== undefined ? response.result : response;
      const extractedUrl = this.extractDownloadUrl(payload);

      if (extractedUrl && this.isAudioStreamUrl(extractedUrl)) {
        const resObj: MediaDownloadResult =
          typeof payload === 'object' && payload !== null ? { ...payload } : {};

        resObj.download = extractedUrl;
        resObj.url = extractedUrl;
        resObj.proxyUrl = `/api/v1/proxy-media?url=${encodeURIComponent(extractedUrl)}`;
        resObj.fallbackUrls = [`/api/v1/proxy-media?url=${encodeURIComponent(extractedUrl)}`];
        resObj.title =
          resObj.title ||
          (payload as any)?.title ||
          (payload as any)?.desc ||
          (payload as any)?.data?.title ||
          'TikTok Video (No Watermark)';
        resObj.author =
          resObj.author ||
          (payload as any)?.author?.nickname ||
          (payload as any)?.author ||
          (payload as any)?.nickname ||
          'TikTok Creator';
        resObj.thumbnail =
          resObj.thumbnail ||
          (payload as any)?.cover ||
          (payload as any)?.data?.cover ||
          (payload as any)?.origin_cover ||
          '';

        return {
          success: true,
          provider: response.provider || 'shiroapi',
          cached: response.cached,
          result: resObj,
        };
      }
    } catch (err) {
      // Primary Worker API error
    }

    // 3. Fallback Attempt: Public TikTok Downloader APIs (TikWM)
    const fallbackUrls = [
      `https://www.tikwm.com/api/?url=${encodeURIComponent(trimmed)}`,
      `https://api.tikwm.com/api/?url=${encodeURIComponent(trimmed)}`,
    ];

    for (const fbUrl of fallbackUrls) {
      try {
        const res = await fetch(fbUrl);
        if (!res.ok) continue;
        const json = await res.json();
        const data = json.data || json.result || json;

        if (data) {
          const rawPlayable =
            data.play ||
            data.hdplay ||
            data.wmplay ||
            data.nowatermark ||
            data.video ||
            data.music ||
            this.extractDownloadUrl(data);

          if (rawPlayable && typeof rawPlayable === 'string') {
            const finalMediaUrl = rawPlayable.startsWith('http')
              ? rawPlayable
              : `https://www.tikwm.com${rawPlayable}`;

            if (this.isAudioStreamUrl(finalMediaUrl)) {
              const proxyUrl = `/api/v1/proxy-media?url=${encodeURIComponent(finalMediaUrl)}`;
              return {
                success: true,
                provider: 'tikwm-fallback',
                result: {
                  download: finalMediaUrl,
                  url: finalMediaUrl,
                  proxyUrl,
                  fallbackUrls: [proxyUrl],
                  play: finalMediaUrl,
                  hdplay: data.hdplay
                    ? data.hdplay.startsWith('http')
                      ? data.hdplay
                      : `https://www.tikwm.com${data.hdplay}`
                    : finalMediaUrl,
                  wmplay: data.wmplay
                    ? data.wmplay.startsWith('http')
                      ? data.wmplay
                      : `https://www.tikwm.com${data.wmplay}`
                    : finalMediaUrl,
                  music: data.music
                    ? data.music.startsWith('http')
                      ? data.music
                      : `https://www.tikwm.com${data.music}`
                    : '',
                  title: data.title || 'TikTok Video (No Watermark)',
                  author:
                    data.author?.nickname ||
                    data.author?.unique_id ||
                    'TikTok Creator',
                  thumbnail: data.cover
                    ? data.cover.startsWith('http')
                      ? data.cover
                      : `https://www.tikwm.com${data.cover}`
                    : '',
                  duration: data.duration ? `${data.duration}s` : '',
                },
              };
            }
          }
        }
      } catch (e) {
        // Fallback endpoint error
      }
    }

    return {
      success: false,
      provider: 'shiroapi',
      message: 'Gagal Memproses Media - API tidak memberikan link media yang bisa diputar.',
      code: 'MEDIA_URL_MISSING',
    };
  }

  /**
   * Search Spotify songs/tracks via Worker (/spotify?query=)
   */
   public async searchSpotify(
  query: string,
  limit: number = 20
): Promise<ApiResponse<SearchItem[]>> {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      success: false,
      message: 'Kata kunci pencarian Spotify tidak boleh kosong.',
      code: 'MISSING_PARAM',
    };
  }

  const requestedLimit = Math.max(1, Math.min(50, Number(limit) || 20));

  const response = await this.request<any>('/spotify', {
    query: trimmed,
    q: trimmed,
    search: trimmed,
    limit: String(requestedLimit),
  });

  if (!response.success) {
    return {
      success: false,
      provider: response.provider,
      cached: response.cached,
      message: response.message || 'Gagal mencari lagu Spotify.',
      code: response.code || 'SPOTIFY_SEARCH_FAILED',
    };
  }

  const payload = response.result;

  const parseValue = (value: any): any => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const parsed = parseValue(payload);

  const topResults = Array.isArray(parsed?.top_results)
    ? parsed.top_results
    : Array.isArray(parsed?.result?.top_results)
      ? parsed.result.top_results
      : [];

  const tracks = Array.isArray(parsed?.tracks)
    ? parsed.tracks
    : Array.isArray(parsed?.result?.tracks)
      ? parsed.result.tracks
      : [];

  const fallbackCollections: any[] = [];
  if (Array.isArray(parsed)) {
    fallbackCollections.push(...parsed);
  } else if (parsed && typeof parsed === 'object') {
    for (const key of ['items', 'results', 'data', 'songs', 'content', 'list', 'search', 'response']) {
      const value = (parsed as any)[key];
      if (Array.isArray(value)) {
        fallbackCollections.push(...value);
      } else if (Array.isArray(value?.items)) {
        fallbackCollections.push(...value.items);
      } else if (Array.isArray(value?.tracks)) {
        fallbackCollections.push(...value.tracks);
      }
    }
  }

  const playableTopResults = topResults.filter((item: any) => {
    const type = String(item?.type || item?.media_type || '').toLowerCase();
    return type === 'track' || type === 'audio' || !!item?.duration_ms || !!item?.playability?.playable;
  });

  const merged = [...tracks, ...playableTopResults, ...fallbackCollections];

  const items = collectUniqueSpotifyItems(merged);

  return {
    success: true,
    provider: response.provider || 'shiroapi',
    cached: response.cached,
    result: items,
  };
}

/**
   * Download Spotify track/playlist info via Worker (/spotify?url=)
   * Mirrors the normalization pattern of getAudioDownload / getVideoDownload / getTikTokDownload
   * so that extractDownloadUrl() is applied to handle any Naze API response shape.
   */
  public async getSpotifyDownload(
    spotifyUrl: string
  ): Promise<ApiResponse<MediaDownloadResult>> {
    const trimmed = spotifyUrl.trim();

    if (!trimmed) {
      return {
        success: false,
        message: 'URL Spotify tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    let responsePayload: any = null;
    let providerName = 'shiroapi';
    let cached = false;

    // 1. First attempt: call worker /spotify API endpoint
    try {
      const response = await this.request<any>(
        '/spotify',
        {
          url: trimmed,
          link: trimmed,
        },
        {
          timeoutMs: 30000,
          retryCount: 1,
          useCache: false,
        }
      );

      if (response.success && response.result) {
        responsePayload = response.result;
        providerName = response.provider || 'shiroapi';
        cached = !!response.cached;
      }
    } catch (e) {
      console.warn('[SPOTIFY API WARN] Worker /spotify request failed:', e);
    }

    // 2. Try extracting direct playable audio MP3 stream from responsePayload
    let extractedUrl = this.extractDownloadUrl(responsePayload);

    // 3. Extract metadata from responsePayload if available
    let title = stringifySpotifyText(
      responsePayload?.title ||
      responsePayload?.name ||
      responsePayload?.track ||
      responsePayload?.song ||
      responsePayload?.track_name ||
      responsePayload?.data?.name ||
      responsePayload?.result?.name ||
      responsePayload?.result?.title ||
      '',
      ''
    );

    let artist = normalizeSpotifyArtistList(
      responsePayload?.artist ||
      responsePayload?.artists ||
      responsePayload?.channel ||
      responsePayload?.owner ||
      responsePayload?.data?.artists ||
      responsePayload?.result?.artists ||
      ''
    );

    let thumbnail = getSpotifyImageUrl(responsePayload) || '';

    // 4. Fallback Engine: If direct MP3 audio link is missing (e.g. status 422 or no URL in response)
    if (!extractedUrl) {
      console.info('[SPOTIFY FALLBACK] Resolving audio stream for Spotify track:', trimmed);

      // If metadata is missing, attempt Spotify Search to obtain track title & artist
      if (!title) {
        try {
          const searchRes = await this.searchSpotify(trimmed, 5);
          if (searchRes.success && Array.isArray(searchRes.result) && searchRes.result.length > 0) {
            const topMatch = searchRes.result[0];
            title = topMatch.title || '';
            artist = topMatch.channel || topMatch.artists || '';
            if (!thumbnail) thumbnail = topMatch.thumbnail || '';
          }
        } catch (searchErr) {
          console.warn('[SPOTIFY FALLBACK WARN] Metadata search failed:', searchErr);
        }
      }

      // If trimmed is a title string rather than a URL, use trimmed as title
      if (!title && !/^https?:\/\//i.test(trimmed)) {
        title = trimmed;
      }

      // Build search query for resolving audio MP3 stream
      const searchQuery = [title, artist].filter(Boolean).join(' ').trim() || trimmed;

      if (searchQuery) {
        try {
          // Attempt 1: Get audio stream using searchQuery via Audio Downloader
          const audioRes = await this.getAudioDownload(searchQuery);
          if (audioRes.success && audioRes.result) {
            const resolvedUrl = this.extractDownloadUrl(audioRes.result);
            if (resolvedUrl) {
              extractedUrl = resolvedUrl;
              if (!title) title = stringifySpotifyText(audioRes.result.title, 'Spotify Track');
              if (!artist) artist = stringifySpotifyText(audioRes.result.channel, 'Spotify Artist');
              if (!thumbnail) thumbnail = stringifySpotifyText(audioRes.result.thumbnail, '');
            }
          }

          // Attempt 2: Search YouTube -> Get top video -> Audio Download
          if (!extractedUrl) {
            const ytSearch = await this.searchYouTube(searchQuery);
            if (ytSearch.success && Array.isArray(ytSearch.result) && ytSearch.result.length > 0) {
              const topVid = ytSearch.result[0];
              const targetUrl = topVid.videoId || topVid.url || (topVid.id ? `https://www.youtube.com/watch?v=${topVid.id}` : '');
              if (targetUrl) {
                const audioRes2 = await this.getAudioDownload(targetUrl);
                if (audioRes2.success && audioRes2.result) {
                  const resolvedUrl2 = this.extractDownloadUrl(audioRes2.result);
                  if (resolvedUrl2) {
                    extractedUrl = resolvedUrl2;
                    if (!title) title = topVid.title || 'Spotify Track';
                    if (!artist) artist = topVid.channel || 'Spotify Artist';
                    if (!thumbnail) thumbnail = topVid.thumbnail || '';
                  }
                }
              }
            }
          }
        } catch (fallbackErr) {
          console.warn('[SPOTIFY FALLBACK ERROR] Audio stream resolution failed:', fallbackErr);
        }
      }
    }

    // 5. Final check: if audio MP3 link could not be obtained
    if (!extractedUrl) {
      return {
        success: false,
        provider: providerName,
        cached,
        message: 'Tidak dapat mengunduh audio MP3 untuk lagu Spotify ini. Silakan coba lagu lain.',
        code: 'SPOTIFY_MEDIA_URL_MISSING',
      };
    }

    const resultObj: MediaDownloadResult =
      typeof responsePayload === 'object' && responsePayload !== null && !Array.isArray(responsePayload)
        ? { ...responsePayload }
        : {};

    resultObj.download = extractedUrl;
    resultObj.url = extractedUrl;
    resultObj.link = extractedUrl;
    resultObj.audio = extractedUrl;
    resultObj.mp3 = extractedUrl;
    resultObj.title = title || stringifySpotifyText(resultObj.title, 'Spotify Track');
    resultObj.artist = artist || stringifySpotifyText(resultObj.artist || resultObj.artists, 'Spotify Artist');
    resultObj.channel = resultObj.artist;
    resultObj.thumbnail = thumbnail || stringifySpotifyText(resultObj.thumbnail, '');
    resultObj.quality = 'Spotify MP3';

    return {
      success: true,
      provider: providerName,
      cached,
      result: resultObj,
    };
  }


  /**
   * Clear in-memory client cache
   */
  public clearCache() {
    this.cache.clear();
  }
}

function stringifyText(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    const list = val.map((v) => stringifyText(v, '')).filter(Boolean);
    return list.length > 0 ? list.join(', ') : fallback;
  }
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.text === 'string') return val.text;
    if (typeof val.artist === 'string') return val.artist;
    if (val.name) return stringifyText(val.name, fallback);
    if (val.title) return stringifyText(val.title, fallback);
  }
  return fallback;
}

function normalizeSpotifyItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const title = stringifyText(
    item.title ??
    item.name ??
    item.track ??
    item.track_name ??
    item.song ??
    item.song_name,
    'Spotify Track'
  );

  const artist = stringifyText(
    item.artist ??
    item.artists ??
    item.artist_name ??
    item.author ??
    item.channel ??
    item.owner ??
    item.uploader,
    'Spotify Artist'
  );

  const album = stringifyText(
    item.album ??
    item.album_name ??
    item.albumName,
    ''
  );

  let thumbnail = '';

  const thumbnailCandidates = [
    item.thumbnail,
    item.cover,
    item.image,
    item.cover_url,
    item.thumbnail_url,
    item.artwork,
    item.artwork_url,
    item.album?.images?.[0]?.url,
    item.images?.[0]?.url,
    item.album?.image,
    item.album?.cover,
    item.sixteen_by_nine_cover?.[0]?.url,
  ];

  for (const candidate of thumbnailCandidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      thumbnail = candidate;
      break;
    }
  }

  const spotifyUrl =
    typeof item.url === 'string' && item.url.includes('spotify')
      ? item.url
      : typeof item.link === 'string' && item.link.includes('spotify')
        ? item.link
        : typeof item.external_urls?.spotify === 'string'
          ? item.external_urls.spotify
          : typeof item.spotify_url === 'string'
            ? item.spotify_url
            : '';

  const download =
    typeof item.download === 'string'
      ? item.download
      : typeof item.audio === 'string'
        ? item.audio
        : typeof item.mp3 === 'string'
          ? item.mp3
          : typeof item.audio_url === 'string'
            ? item.audio_url
            : typeof item.download_url === 'string'
              ? item.download_url
              : '';

  const duration =
    stringifyText(
      item.duration ??
      item.duration_ms ??
      item.length ??
      item.timestamp,
      ''
    );

  return {
    ...item,

    // Identitas lagu
    title,
    name: title,
    artist,
    artists: artist,
    album,

    // Gambar
    thumbnail,
    cover: thumbnail,
    image: thumbnail,

    // URL Spotify
    url: spotifyUrl,
    link: spotifyUrl,

    // URL media kalau API memang menyediakannya
    download,
    audio: download,
    mp3: download,

    duration,
  };
}


export const apiClient = new ApiClient();
