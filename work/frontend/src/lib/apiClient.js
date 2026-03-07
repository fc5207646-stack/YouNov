export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const isBodyAllowed = method !== 'GET' && method !== 'HEAD';
  const hasBody = isBodyAllowed && options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const shouldJsonify = hasBody && !isFormData && typeof options.body !== 'string';

  // Timeout logic (default 20s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 20000);
  const signal = options.signal || controller.signal;

  let res;
  try {
    res = await fetch(url, {
      credentials: 'include',
      headers: {
        ...(shouldJsonify ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      ...options,
      signal, // Use our signal (or user's)
      body: hasBody ? (shouldJsonify ? JSON.stringify(options.body) : options.body) : undefined
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw {
        error: 'timeout',
        message: 'Request timed out (server took too long)',
        status: 408
      };
    }
    const normalized = {
      error: 'network_error',
      message: error?.message || 'Network error',
      status: 0
    };
    throw normalized;
  }

  const contentType = res.headers.get('content-type') || '';
  const isNoContent = res.status === 204 || res.status === 205;
  const data = isNoContent
    ? null
    : contentType.includes('application/json')
      ? await res.json().catch(() => null)
      : await res.text().catch(() => null);

  if (!res.ok) {
    const error = typeof data === 'object' && data ? { ...data } : {};
    const message = typeof data === 'string' && data.trim()
      ? data.trim()
      : error.message || error.error || 'request_failed';
    error.message = message;
    error.error = error.error || message;
    error.status = res.status;
    throw error;
  }

  return data;
}

