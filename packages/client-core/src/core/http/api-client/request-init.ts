import type { ApiRequest } from './api-client.types';

const contentType = (hasBody: boolean): HeadersInit =>
  hasBody ? { 'Content-Type': 'application/json' } : {};

/** The fetch init of one request: its method, the caller headers and the body as JSON. */
export function requestInit(request: ApiRequest): RequestInit {
  const hasBody = request.body !== undefined;
  const headers = new Headers(request.headers);
  new Headers(contentType(hasBody)).forEach((value, key) => headers.set(key, value));
  const body = hasBody ? { body: JSON.stringify(request.body) } : {};
  return { method: request.method ?? 'GET', headers, ...body };
}
