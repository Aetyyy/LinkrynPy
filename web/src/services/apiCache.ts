interface CachedResponse {
  expiresAt: number;
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
}

const responseCache = new Map<string, CachedResponse>();

function getCacheKey(url: string, init?: RequestInit): string {
  const authorization = new Headers(init?.headers).get('Authorization') || '';
  return `${url}::${authorization}`;
}

export async function fetchCached(
  url: string,
  init: RequestInit | undefined,
  ttlMs: number,
): Promise<Response> {
  const cacheKey = getCacheKey(url, init);
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }
  if (cached) responseCache.delete(cacheKey);

  const response = await fetch(url, init);
  if (response.ok && (!init?.method || init.method.toUpperCase() === 'GET')) {
    const body = await response.clone().text();
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      body,
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
    });
    if (responseCache.size > 250) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) responseCache.delete(oldestKey);
    }
  }
  return response;
}

export function clearApiCache(): void {
  responseCache.clear();
}
