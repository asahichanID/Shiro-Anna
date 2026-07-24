import express from 'express';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express API Proxy for Youtube Search API to bypass browser CORS completely
  app.get('/api/naze-search', async (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      const endpoint = `https://api.naze.biz.id/search/youtube?query=${encodeURIComponent(
        query
      )}&apikey=nz-880c23d4fd`;

      const apiRes = await fetch(endpoint, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!apiRes.ok) {
        return res
          .status(apiRes.status)
          .json({ error: `API Naze returned HTTP status ${apiRes.status}` });
      }

      const data = await apiRes.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Server proxy error for search:', err);
      return res.status(500).json({ error: err.message || 'Server proxy failed' });
    }
  });

  // Express API Proxy for Youtube Download API to bypass browser CORS completely
  app.get('/api/naze-download', async (req, res) => {
    try {
      const youtubeUrl = (req.query.url as string) || '';
      const format = (req.query.format as string) || 'mp3';
      const endpoint = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(
        youtubeUrl
      )}&format=${encodeURIComponent(format)}&apikey=nz-880c23d4fd`;

      const apiRes = await fetch(endpoint, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!apiRes.ok) {
        return res
          .status(apiRes.status)
          .json({ error: `API Naze returned HTTP status ${apiRes.status}` });
      }

      const data = await apiRes.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Server proxy error for download:', err);
      return res.status(500).json({ error: err.message || 'Server proxy failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
