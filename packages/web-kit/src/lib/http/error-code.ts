import { ApiError } from './api';

/** Domain error code of an API failure (`{ code }`, docs/10 §3), else null. */
export function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: unknown } | null;
  return typeof body?.code === 'string' ? body.code : null;
}
