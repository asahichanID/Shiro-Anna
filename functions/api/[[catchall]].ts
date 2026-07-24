// Cloudflare Pages Function fallback for unhandled /api/* routes
export async function onRequest(context: { request: Request }) {
  const url = new URL(context.request.url);

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

  return new Response(
    JSON.stringify({
      error: 'Endpoint API tidak ditemukan',
      debug: {
        endpoint: url.pathname,
        workerStatus: 'Active (Cloudflare Pages Catchall Fallback)',
        responseStatus: 404,
        provider: 'Cloudflare Worker / Pages Function',
      },
    }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
