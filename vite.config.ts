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

        const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const apiKey = process.env.NAZE_API_KEY || 'nz-880c23d4fd';

        if (reqUrl.pathname === '/api/naze-search') {
          const searchQuery = reqUrl.searchParams.get('query');
          if (!searchQuery) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Parameter query diperlukan' }));
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

            const status = apiRes.status;
            const bodyText = await apiRes.text();

            res.statusCode = status >= 400 && status < 600 ? status : 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(bodyText);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: err.message || 'Worker fetch failed in Vite Dev Server',
                type: 'Vite Dev Proxy Exception',
              })
            );
          }
          return;
        }

        if (reqUrl.pathname === '/api/naze-download') {
          const mediaUrl = reqUrl.searchParams.get('url');
          const format = reqUrl.searchParams.get('format') || 'mp3';

          if (!mediaUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Parameter url diperlukan' }));
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

            const status = apiRes.status;
            const bodyText = await apiRes.text();

            res.statusCode = status >= 400 && status < 600 ? status : 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(bodyText);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: err.message || 'Worker download fetch failed in Vite Dev Server',
                type: 'Vite Dev Proxy Exception',
              })
            );
          }
          return;
        }

        next();
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
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
