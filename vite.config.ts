import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function cloudflareApiDevPlugin(): Plugin {
  return {
    name: 'cloudflare-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const startTime = Date.now();
        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const cleanPath = reqUrl.pathname.replace(/\/$/, '') || '/';
        const apiKey = process.env.NAZE_API_KEY || 'nz-880c23d4fd';

        if (cleanPath === '/api/search') {
          const searchQuery = reqUrl.searchParams.get('query');
          if (!searchQuery) {
            const duration = Date.now() - startTime;
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                error: 'Parameter query diperlukan',
                debug: {
                  endpoint: '/api/search',
                  workerStatus: 'Active (Vite Cloudflare Proxy)',
                  responseStatus: 400,
                  responseTime: `${duration}ms`,
                  provider: 'Naze API Search',
                },
              })
            );
            return;
          }

          const targetUrl = `https://api.naze.biz.id/search/youtube?query=${encodeURIComponent(
            searchQuery
          )}&apikey=${encodeURIComponent(apiKey)}`;

          try {
            const apiRes = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/json',
              },
            });

            const duration = Date.now() - startTime;
            const status = apiRes.status;
            const bodyText = await apiRes.text();

            res.statusCode = status >= 400 && status < 600 ? status : 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(bodyText);
          } catch (err: any) {
            const duration = Date.now() - startTime;
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                error: err.message || 'Worker fetch failed in Vite Dev Server',
                debug: {
                  endpoint: '/api/search',
                  workerStatus: 'Error (Vite Dev Server Exception)',
                  responseStatus: 500,
                  responseTime: `${duration}ms`,
                  provider: 'Cloudflare Worker Dev Proxy',
                },
              })
            );
          }
          return;
        }

        if (cleanPath === '/api/download/audio' || cleanPath === '/api/download/video') {
          const isAudio = cleanPath === '/api/download/audio';
          const mediaUrl = reqUrl.searchParams.get('url');
          const format = isAudio ? 'mp3' : '720';

          if (!mediaUrl) {
            const duration = Date.now() - startTime;
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                error: 'Parameter url diperlukan',
                debug: {
                  endpoint: cleanPath,
                  workerStatus: 'Active (Vite Cloudflare Proxy)',
                  responseStatus: 400,
                  responseTime: `${duration}ms`,
                  provider: `Naze API Download (${isAudio ? 'Audio' : 'Video'})`,
                },
              })
            );
            return;
          }

          const targetUrl = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(
            mediaUrl
          )}&format=${encodeURIComponent(format)}&apikey=${encodeURIComponent(apiKey)}`;

          try {
            const apiRes = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/json',
              },
            });

            const duration = Date.now() - startTime;
            const status = apiRes.status;
            const bodyText = await apiRes.text();

            res.statusCode = status >= 400 && status < 600 ? status : 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(bodyText);
          } catch (err: any) {
            const duration = Date.now() - startTime;
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
              JSON.stringify({
                error: err.message || 'Worker download fetch failed in Vite Dev Server',
                debug: {
                  endpoint: cleanPath,
                  workerStatus: 'Error (Vite Dev Server Exception)',
                  responseStatus: 500,
                  responseTime: `${duration}ms`,
                  provider: 'Cloudflare Worker Dev Proxy',
                },
              })
            );
          }
          return;
        }

        // Return JSON 404 for any unhandled /api/* request so it NEVER falls back to index.html
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(
          JSON.stringify({
            error: 'Endpoint API tidak ditemukan',
            debug: {
              endpoint: reqUrl.pathname,
              workerStatus: 'Active (Vite Dev Fallback)',
              responseStatus: 404,
              provider: 'Cloudflare Worker Dev Proxy',
            },
          })
        );
        return;
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflareApiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', 'motion'],
      exclude: ['@tailwindcss/vite', '@tailwindcss/oxide'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
