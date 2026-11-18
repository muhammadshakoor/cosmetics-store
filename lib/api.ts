export const API_URL = '/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error: unknown = await res.json().catch(() => null);
    const data = error && typeof error === 'object' && !Array.isArray(error) ? error as Record<string, unknown> : {};
    throw new ApiError(typeof data.message === 'string' ? data.message : 'Request failed. Please try again.', res.status, data);
  }

  return res.json() as Promise<T>;
}
