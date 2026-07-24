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

    // Send both query and q parameters to support any Worker parameter handler
    let response = await this.request('/search', { query: trimmed, q: trimmed });

    if (!response.success) {
      // Try secondary endpoint if /search failed
      response = await this.request('/search', { query: trimmed, q: trimmed });
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
   * Helper to extract download link from various response shapes
   */
  private extractDownloadUrl(payload: any): string {
    if (!payload) return '';

    if (typeof payload === 'string') {
      if (payload.startsWith('http://') || payload.startsWith('https://')) {
        return payload;
      }
      return '';
    }

    const primaryKeys = [
      'download',
      'nowatermark',
      'audio',
      'video',
      'mp3',
      'mp4',
      'url',
      'link',
      'dl',
      'media',
      'src',
      'stream',
      'play',
      'file',
    ];

    if (typeof payload === 'object') {
      for (const key of primaryKeys) {
        if (payload[key] && typeof payload[key] === 'string' && payload[key].startsWith('http')) {
          return payload[key];
        }
      }

      const nestedKeys = ['result', 'data', 'info', 'response', 'item', 'item_list', 'formats', 'format'];
      for (const key of nestedKeys) {
        if (payload[key]) {
          const found = this.extractDownloadUrl(payload[key]);
          if (found) return found;
        }
      }

      if (Array.isArray(payload)) {
        for (const item of payload) {
          const found = this.extractDownloadUrl(item);
          if (found) return found;
        }
      }

      for (const k of Object.keys(payload)) {
        const val = payload[k];
        if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
          return val;
        } else if (typeof val === 'object' && val !== null) {
          const found = this.extractDownloadUrl(val);
          if (found) return found;
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
    let fullUrl = '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      fullUrl = trimmed;
      // Try to extract videoId from watch?v= or youtu.be/
      try {
        const urlObj = new URL(trimmed);
        if (urlObj.hostname.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v') || '';
        } else if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.replace(/^\/+/, '');
        }
      } catch {}
    } else {
      // Check if trimmed itself is a valid YouTube video ID (e.g. 11 chars or alphanumeric)
      if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        videoId = trimmed;
        fullUrl = `https://www.youtube.com/watch?v=${trimmed}`;
      } else {
        fullUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(trimmed)}`;
      }
    }

    params.url = fullUrl;

    // Only set 'id' if it matches the Worker's strict alphanumeric/hyphen/underscore requirement
    if (videoId && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
      params.id = videoId;
    }

    return params;
  }

  /**
   * Get Audio (MP3) download information via Worker (/audio?url=)
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
    const response = await this.request<MediaDownloadResult>('/audio', params);

    const payload = response.result !== undefined ? response.result : response;
    let extractedUrl = this.extractDownloadUrl(payload);

    if (!extractedUrl) {
      // Fallback download/stream URL
      extractedUrl = params.url || (params.id ? `https://www.youtube.com/watch?v=${params.id}` : '');
    }

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

  /**
   * Get Video (MP4) download information via Worker (/video?url=&quality=720)
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

    const params = this.prepareMediaParams(trimmed, { quality: quality || '720' });
    const response = await this.request<MediaDownloadResult>('/video', params);

    const payload = response.result !== undefined ? response.result : response;
    let extractedUrl = this.extractDownloadUrl(payload);

    if (!extractedUrl) {
      extractedUrl = params.url || (params.id ? `https://www.youtube.com/watch?v=${params.id}` : '');
    }

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

  /**
   * Download TikTok video/audio info via Worker (/tiktok?url=)
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

    const response = await this.request<MediaDownloadResult>('/tiktok', { url: trimmed });

    const payload = response.result !== undefined ? response.result : response;
    let extractedUrl = this.extractDownloadUrl(payload);

    if (!extractedUrl) {
      extractedUrl = trimmed;
    }

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

  /**
   * Search Spotify songs/tracks via Worker (/spotify?query=)
   */
  public async searchSpotify(query: string): Promise<ApiResponse<any>> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'Kata kunci pencarian Spotify tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    return this.request('/spotify', { query: trimmed });
  }

  /**
   * Download Spotify track/playlist info via Worker (/spotify?url=)
   */
  public async getSpotifyDownload(spotifyUrl: string): Promise<ApiResponse<MediaDownloadResult>> {
    const trimmed = spotifyUrl.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'URL Spotify tidak boleh kosong.',
        code: 'MISSING_PARAM',
      };
    }

    return this.request<MediaDownloadResult>('/spotify', { url: trimmed });
  }

  /**
   * Clear in-memory client cache
   */
  public clearCache() {
    this.cache.clear();
  }
}

export const apiClient = new ApiClient();
