import type { OAuth2Client } from 'google-auth-library';
import type { GoogleEndpoints } from '../../env';
import { GoogleApiError } from './google-client.port';

type RequestOpts = Parameters<OAuth2Client['request']>[0];
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** One authorised call: the OAuth2Client adds the bearer and refreshes it (google-auth-library). */
export interface HttpCall {
  method: Method;
  url: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Google's reason: `error.errors[0].reason`, `error.status`, or the OAuth `error` string. */
function reasonOf(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const e = err as { errors?: { reason?: string }[]; status?: string };
      return e.errors?.[0]?.reason ?? e.status ?? 'error';
    }
  }
  return 'error';
}

/** Any failure → GoogleApiError(status, reason); no status (network) → 0 'network'. Never a token. */
export function toGoogleError(e: unknown): GoogleApiError {
  if (e instanceof GoogleApiError) return e;
  const err = e as { status?: number; response?: { status?: number; data?: unknown }; message?: string };
  const status = err.response?.status ?? err.status ?? 0;
  const reason = err.response?.data !== undefined ? reasonOf(err.response.data) : /invalid_grant/.test(err.message ?? '') ? 'invalid_grant' : 'network';
  return new GoogleApiError(status, reason);
}

/** The REST layer shared by the Calendar, Drive and Sheets adapters. */
export class GoogleHttp {
  constructor(
    private readonly auth: OAuth2Client,
    readonly endpoints: GoogleEndpoints,
  ) {}

  async send<T>(call: HttpCall): Promise<T> {
    const opts: RequestOpts = {
      method: call.method,
      url: call.url,
      ...(call.query ? { params: call.query } : {}),
      ...(call.body !== undefined ? { data: call.body } : {}),
      ...(call.headers ? { headers: call.headers } : {}),
      timeout: 30_000,
      retry: false,
    };
    try {
      const res = await this.auth.request<T>(opts);
      return res.data;
    } catch (e) {
      throw toGoogleError(e);
    }
  }

  /** null on 404 / 410 (deleted by someone in Google). */
  async maybe<T>(call: HttpCall): Promise<T | null> {
    try {
      return await this.send<T>(call);
    } catch (e) {
      if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return null;
      throw e;
    }
  }
}
