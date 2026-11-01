import type { HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';

// The Expo profile (docs/36 h2): EXPO_API_BASE, the access token when set, 10 s, no retries.

/** Off the request path, but a hung Expo must not pile up calls. */
export const EXPO_TIMEOUT_MS = 10_000;

interface ExpoHttpInput {
  /** EXPO_API_BASE, set (unset = push off: the callers never build a client). */
  base: string;
  accessToken: string | undefined;
  /** The message prefix: «expo receipts» → «expo receipts HTTP 503». */
  label: string;
}

const tokenHeader = (token: string | undefined): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

export function expoHttp(input: ExpoHttpInput): Http {
  const describe = (f: HttpFailure): string => (f.kind === 'status' ? `HTTP ${f.status}` : f.kind);
  return createHttp({
    name: input.label,
    base: () => input.base.replace(/\/+$/, ''),
    headers: () => Promise.resolve({ accept: 'application/json', ...tokenHeader(input.accessToken) }),
    timeoutMs: EXPO_TIMEOUT_MS,
    redirect: 'follow',
    errorBody: 'omit',
    errors: { default: (f) => new Error(`${input.label} ${describe(f)}`) },
  });
}
