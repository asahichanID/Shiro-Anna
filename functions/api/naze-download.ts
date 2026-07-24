// Cloudflare Pages Function / Worker endpoint for /api/naze-download
export async function onRequest(context: { request: Request; env: any }) {
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
  const format = url.searchParams.get('format') || 'mp3';
  const apiKey =
    context.env?.NAZE_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.NAZE_API_KEY : null) ||
    'nz-880c23d4fd';

  if (!mediaUrl) {
    return new Response(
      JSON.stringify({ error: 'Parameter url diperlukan' }),
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

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({
          error: `Naze Download API gagal dengan HTTP Status ${status}`,
          status,
          body: bodyText,
          targetUrl,
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
          error: 'Respon dari Naze Download API bukan format JSON yang valid',
          body: bodyText.substring(0, 500),
          targetUrl,
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
    return new Response(
      JSON.stringify({
        error: err.message || 'Gagal menghubungi Naze Download API dari Cloudflare Worker',
        type: 'Cloudflare Worker Exception',
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
