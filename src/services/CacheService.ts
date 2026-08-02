/**
 * Cache Storage & Thumbnail Processing Service for Oguri Jukebox
 * Handles Smart Center Crop using Canvas to remove black letterboxes (1:1 Aspect Ratio).
 * Caches thumbnails and track metadata in Cache Storage.
 */

const CACHE_NAME = 'oguri-jukebox-v2';
const THUMB_CACHE_NAME = 'oguri-jukebox-thumbnails-v2';

const memoryThumbCache = new Map<string, string>();

export interface CachedTrackMetadata {
  trackId: string;
  source?: string;
  videoId?: string;
  title: string;
  artist: string;
  thumbnail: string;
  downloadUrl: string;
  duration?: string;
  audioExpireAt?: number | null;
  cachedAt: number;
}

export class CacheService {
  /**
   * Smart Center Crop using HTML Canvas / ImageBitmap
   * Removes black letterbox borders and outputs a crisp 1:1 square image data URL.
   */
  public static async getSmartCroppedThumbnail(imageUrl: string): Promise<string> {
    if (!imageUrl) return '';
    if (memoryThumbCache.has(imageUrl)) {
      return memoryThumbCache.get(imageUrl)!;
    }

    // Check Cache Storage first
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(THUMB_CACHE_NAME);
        const reqKey = new Request(`/thumb-crop?url=${encodeURIComponent(imageUrl)}`);
        const cachedRes = await cache.match(reqKey);
        if (cachedRes) {
          const text = await cachedRes.text();
          if (text && text.startsWith('data:image')) {
            memoryThumbCache.set(imageUrl, text);
            return text;
          }
        }
      } catch (e) {
        // Ignore Cache Storage match error
      }
    }

    // Process image with HTML Canvas
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(imageUrl);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          if (w === 0 || h === 0) {
            resolve(imageUrl);
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            resolve(imageUrl);
            return;
          }

          ctx.drawImage(img, 0, 0);

          let top = 0;
          let bottom = h;

          try {
            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;

            const isDark = (x: number, y: number) => {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              return r < 35 && g < 35 && b < 35;
            };

            // Detect top black border
            for (let y = 0; y < Math.floor(h / 3); y++) {
              let darkCount = 0;
              const sampleStep = Math.max(1, Math.floor(w / 20));
              let samples = 0;
              for (let x = 0; x < w; x += sampleStep) {
                samples++;
                if (isDark(x, y)) darkCount++;
              }
              if (darkCount / samples > 0.85) {
                top = y + 1;
              } else {
                break;
              }
            }

            // Detect bottom black border
            for (let y = h - 1; y > Math.floor((2 * h) / 3); y--) {
              let darkCount = 0;
              const sampleStep = Math.max(1, Math.floor(w / 20));
              let samples = 0;
              for (let x = 0; x < w; x += sampleStep) {
                samples++;
                if (isDark(x, y)) darkCount++;
              }
              if (darkCount / samples > 0.85) {
                bottom = y;
              } else {
                break;
              }
            }
          } catch (e) {
            // CORS restriction on getImageData
          }

          const realH = Math.max(40, bottom - top);
          const realW = w;

          // 1:1 Square Crop
          const squareSize = Math.min(realW, realH);
          const cropX = Math.floor((realW - squareSize) / 2);
          const cropY = top + Math.floor((realH - squareSize) / 2);

          const sqCanvas = document.createElement('canvas');
          sqCanvas.width = 300;
          sqCanvas.height = 300;
          const sqCtx = sqCanvas.getContext('2d');

          if (sqCtx) {
            sqCtx.drawImage(
              canvas,
              cropX,
              cropY,
              squareSize,
              squareSize,
              0,
              0,
              300,
              300
            );

            const croppedDataUrl = sqCanvas.toDataURL('image/jpeg', 0.88);
            memoryThumbCache.set(imageUrl, croppedDataUrl);

            // Put into Cache Storage
            if ('caches' in window) {
              try {
                const cache = await caches.open(THUMB_CACHE_NAME);
                const reqKey = new Request(`/thumb-crop?url=${encodeURIComponent(imageUrl)}`);
                await cache.put(reqKey, new Response(croppedDataUrl, { headers: { 'Content-Type': 'text/plain' } }));
              } catch (e) {}
            }

            resolve(croppedDataUrl);
            return;
          }
        } catch (err) {
          console.warn('[SMART CROP WARN] Canvas processing error:', err);
        }
        resolve(imageUrl);
      };

      img.onerror = () => {
        resolve(imageUrl);
      };

      img.src = imageUrl;
    });
  }

  /**
   * Cache track metadata and thumbnail image in Cache Storage
   */
  public static async cacheTrackMetadata(metadata: CachedTrackMetadata): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const metaKey = new Request(`/cache/metadata/${metadata.trackId}`);
      const metaResponse = new Response(JSON.stringify(metadata), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(metaKey, metaResponse);

      // Pre-crop and cache thumbnail
      if (metadata.thumbnail) {
        await this.getSmartCroppedThumbnail(metadata.thumbnail);
      }
    } catch (err) {
      console.warn('[CACHE SERVICE WARN] Failed to cache track metadata:', err);
    }
  }

  /**
   * Retrieve cached track metadata
   */
  public static async getCachedTrackMetadata(trackId: string): Promise<CachedTrackMetadata | null> {
    if (typeof window === 'undefined' || !('caches' in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const metaKey = new Request(`/cache/metadata/${trackId}`);
      const res = await cache.match(metaKey);
      if (res) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[CACHE SERVICE WARN] Failed to get cached metadata:', err);
    }
    return null;
  }
}
