const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export const pause = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return readJson<T>(response);
}

export async function requestJsonWithFallback<T>(request: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await request();
  } catch {
    return await Promise.resolve(fallback());
  }
}
