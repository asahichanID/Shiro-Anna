// Cloudflare Pages Function for GET /api/download/audio
export async function onRequest(context: { request: Request; env: any }) {
  const startTime = Date.now();
  const url = new URL(context.request.url);

  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const mediaUrl = url.searchParams.get('url');
  const apiKey =
    context.env?.NAZE_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.NAZE_API_KEY : null) ||
    'nz-880c23d4fd';

  if (!mediaUrl) {
    const duration = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        error: 'Parameter url diperlukan',
        debug: {
          endpoint: '/api/download/audio',
          workerStatus: 'Active (Cloudflare Pages Function)',
          responseStatus: 400,
          responseTime: `${duration}ms`,
          provider: 'Naze API Download Audio',
        },
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const targetUrl = `https://api.naze.biz.id/download/youtube?url=${encodeURIComponent(
    mediaUrl
  )}&format=mp3&apikey=${encodeURIComponent(apiKey)}`;

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

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({
          error: `Naze Download Audio API gagal dengan HTTP Status ${status}`,
          debug: {
            endpoint: '/api/download/audio',
            workerStatus: 'Active (Cloudflare Pages Function)',
            responseStatus: status,
            responseTime: `${duration}ms`,
            provider: 'Naze API Download (https://api.naze.biz.id/download/youtube)',
            bodySnippet: bodyText.substring(0, 300),
          },
        }),
        {
          status: status >= 400 && status < 600 ? status : 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Respon dari Naze Download Audio API bukan format JSON yang valid',
          debug: {
            endpoint: '/api/download/audio',
            workerStatus: 'Active (Cloudflare Pages Function)',
            responseStatus: 502,
            responseTime: `${duration}ms`,
            provider: 'Naze API Download Audio',
            bodySnippet: bodyText.substring(0, 300),
          },
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        error: err.message || 'Gagal menghubungi Naze Download Audio API dari Cloudflare Worker',
        debug: {
          endpoint: '/api/download/audio',
          workerStatus: 'Error (Worker Exception)',
          responseStatus: 500,
          responseTime: `${duration}ms`,
          provider: 'Cloudflare Worker Proxy',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
