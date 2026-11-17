import type { OAuth2Client } from 'google-auth-library';
import type { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import { Passthrough } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http, JsonCall } from '@/common/infra/http/http.types';
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
 * The bearer from google-auth-library, refreshed when it is about to expire. A failed refresh is
 * the GoogleApiError it was before (invalid_grant → auth), not a network failure.
 */
async function bearerOf(auth: OAuth2Client): Promise<Record<string, string>> {
  try {
    return Object.fromEntries(await auth.getRequestHeaders());
  } catch (e) {
    throw new Passthrough(toGoogleError(e));
  }
}

interface Profile {
  auth: OAuth2Client;
  endpoints: GoogleEndpoints;
  errors: ErrorTable<Error>;
}

/** Google's profile of the one outbound client (docs/36 h7): global fetch, redirects followed. */
const googleHttp = (p: Profile): Http =>
  createHttp({
    name: 'google',
    base: () => p.endpoints.api,
    headers: () => bearerOf(p.auth),
    timeoutMs: TIMEOUT_MS,
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
    auth: OAuth2Client,
    readonly endpoints: GoogleEndpoints,
  ) {
    this.http = googleHttp({ auth, endpoints, errors: GOOGLE_ERRORS });
    this.lookup = googleHttp({ auth, endpoints, errors: LOOKUP_ERRORS });
  }

  /** One authorised call; its answer parsed by `call.schema`. */
  send<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S>> {
    return this.http.json(call);
  }

  /** null on 404 / 410 (deleted by someone in Google). */
  maybe<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S> | null> {
    return this.lookup.json(call).catch(nullIfGone);
  }
}
