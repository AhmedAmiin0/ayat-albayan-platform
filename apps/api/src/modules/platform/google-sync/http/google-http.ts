import type { OAuth2Client } from 'google-auth-library';
import type { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import { createHttp } from '@/common/infra/http/http';
import type { Http, HttpRequest, JsonCall } from '@/common/infra/http/http.types';
import type { GoogleEndpoints } from '@/config/env/env';
import {
  Gone,
  GOOGLE_ERRORS,
  googleErrorSchema,
  LOOKUP_ERRORS,
  toGoogleError,
} from './google-error';

/** Today's `timeout: 30_000, retry: false`: the core never retries (backoff and pg-boss do). */
const TIMEOUT_MS = 30_000;

/**
 * The bearer from google-auth-library, refreshed when it is about to expire. It runs before the
 * call, outside its deadline (as before docs/36 h7): a slow refresh only delays the item. A failed
 * refresh is the GoogleApiError it was before (invalid_grant → auth), not a network failure.
 */
async function bearerOf(auth: OAuth2Client): Promise<Record<string, string>> {
  try {
    return Object.fromEntries(await auth.getRequestHeaders());
  } catch (e) {
    throw toGoogleError(e);
  }
}

/** Test seam only: the API call's deadline (30 s in the app). */
export interface GoogleHttpOptions {
  timeoutMs?: number;
}

interface Profile {
  endpoints: GoogleEndpoints;
  errors: ErrorTable<Error>;
  timeoutMs: number;
}

/**
 * Google's profile of the one outbound client (docs/36 h7): global fetch, redirects followed.
 * No profile headers: GoogleHttp adds the bearer it fetched before the call's deadline.
 */
const googleHttp = (p: Profile): Http =>
  createHttp({
    name: 'google',
    base: () => p.endpoints.api,
    headers: () => Promise.resolve({}),
    timeoutMs: p.timeoutMs,
    redirect: 'follow',
    errorBody: googleErrorSchema,
    errors: p.errors,
  });

const nullIfGone = (e: unknown): null => {
  if (e instanceof Gone) return null;
  throw e;
};

/** The REST layer shared by the Calendar, Drive and Sheets adapters. */
export class GoogleHttp {
  private readonly http: Http;
  private readonly lookup: Http;

  constructor(
    private readonly auth: OAuth2Client,
    readonly endpoints: GoogleEndpoints,
    opts: GoogleHttpOptions = {},
  ) {
    const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
    this.http = googleHttp({ endpoints, errors: GOOGLE_ERRORS, timeoutMs });
    this.lookup = googleHttp({ endpoints, errors: LOOKUP_ERRORS, timeoutMs });
  }

  /** One authorised call; its answer parsed by `call.schema`. */
  async send<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S>> {
    return this.http.json(await this.authorised(call));
  }

  /** null on 404 / 410 (deleted by someone in Google). */
  async maybe<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S> | null> {
    return this.lookup.json(await this.authorised(call)).catch(nullIfGone);
  }

  /** The bearer first (the refresh, no deadline); the call's own headers win, as before. */
  private async authorised<C extends HttpRequest>(call: C): Promise<C> {
    const bearer = await bearerOf(this.auth);
    return { ...call, headers: { ...bearer, ...call.headers } };
  }
}
