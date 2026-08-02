type ProgressListener = (data: { isDownloading: boolean; progress: number; isCompleted: boolean }) => void;

const IDB_NAME = 'SplashVideoCacheDB';
const IDB_STORE = 'media_cache';
const CACHE_KEY = 'splash_mp4';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class VideoCacheService {
  private static instance: VideoCacheService;
  private listeners: Set<ProgressListener> = new Set();
  private isDownloading: boolean = false;
  private progress: number = 0;
  private isCompleted: boolean = false;
  private cachedBlobUrl: string | null = null;
  private downloadPromise: Promise<string> | null = null;

  private constructor() {
    this.checkInitialCache();
  }

  public static getInstance(): VideoCacheService {
    if (!VideoCacheService.instance) {
      VideoCacheService.instance = new VideoCacheService();
    }
    return VideoCacheService.instance;
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    listener({
      isDownloading: this.isDownloading,
      progress: this.progress,
      isCompleted: this.isCompleted,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const data = {
      isDownloading: this.isDownloading,
      progress: this.progress,
      isCompleted: this.isCompleted,
    };
    this.listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.warn('[VideoCacheService] Listener error:', err);
      }
    });
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        request.onsuccess = (e: any) => resolve(e.target.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async checkInitialCache(): Promise<string | null> {
    if (this.cachedBlobUrl) return this.cachedBlobUrl;
    try {
      const db = await this.getDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(CACHE_KEY);

        req.onsuccess = () => {
          const res = req.result;
          if (
            res &&
            res.blob &&
            res.blob.size > 100000 &&
            !res.blob.type.includes('text/html') &&
            Date.now() - res.timestamp < CACHE_TTL_MS
          ) {
            this.cachedBlobUrl = URL.createObjectURL(res.blob);
            this.isCompleted = true;
            this.progress = 100;
            this.isDownloading = false;
            this.notify();
            resolve(this.cachedBlobUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async getOrFetchVideo(videoUrl: string = '/assets/splash.mp4'): Promise<string> {
    // 1. If already cached in memory
    if (this.cachedBlobUrl) {
      return this.cachedBlobUrl;
    }

    // 2. Check IndexedDB
    const existing = await this.checkInitialCache();
    if (existing) {
      return existing;
    }

    // 3. If download in progress, return promise
    if (this.downloadPromise) {
      return this.downloadPromise;
    }

    // 4. Start background download
    this.downloadPromise = this.startBackgroundDownload(videoUrl);
    return this.downloadPromise;
  }

  private async startBackgroundDownload(videoUrl: string): Promise<string> {
    this.isDownloading = true;
    this.progress = 0;
    this.isCompleted = false;
    this.notify();

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', videoUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.floor((event.loaded / event.total) * 100));
          this.progress = percent;
          this.notify();
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200 && xhr.response instanceof Blob && xhr.response.size > 100000) {
          const blob = xhr.response;
          if (!blob.type.includes('text/html')) {
            const blobUrl = URL.createObjectURL(blob);
            this.cachedBlobUrl = blobUrl;
            this.progress = 100;
            this.isDownloading = false;
            this.isCompleted = true;
            this.notify();

            // Store in IndexedDB
            try {
              const db = await this.getDB();
              if (db) {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                const store = tx.objectStore(IDB_STORE);
                store.put({ blob, timestamp: Date.now() }, CACHE_KEY);
              }
            } catch (err) {
              console.warn('[VideoCacheService] Failed to store blob in IndexedDB:', err);
            }

            resolve(blobUrl);
            return;
          }
        }

        // Fallback to direct URL if download fails
        this.isDownloading = false;
        this.progress = 100;
        this.notify();
        resolve(videoUrl);
      };

      xhr.onerror = () => {
        console.warn('[VideoCacheService] XHR error downloading video, using direct URL fallback');
        this.isDownloading = false;
        this.progress = 100;
        this.notify();
        resolve(videoUrl);
      };

      xhr.send();
    });
  }
}

export const videoCacheService = VideoCacheService.getInstance();
