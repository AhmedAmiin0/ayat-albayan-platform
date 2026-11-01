import type { FetchLike, HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import type { KapsoLineEnv } from '@/config/env/env';

// The Kapso profile for its Platform API (docs/36 h4): the line's X-API-Key, the body of an
// error never kept (it may carry a family's number), redirects followed as before.

/** Per call; reopenKapsoConversation passes what is left of its shared budget. */
const CALL_MS = 10_000;

const PROXY_TAIL = /\/meta\/whatsapp$/;

/** Beside the Meta proxy: …/meta/whatsapp → …/platform/v1, else base/platform/v1. */
export function platformBase(proxyBase: string): string {
  const base = proxyBase.replace(/\/+$/, '');
  return `${base.replace(PROXY_TAIL, '')}/platform/v1`;
}

/** A non-2xx is «Kapso HTTP 500» as before; a dropped connection names the call, never the URL. */
const failed = (f: HttpFailure): Error =>
  new Error(f.kind === 'status' ? `Kapso HTTP ${f.status}` : `${f.where} failed`);

export function kapsoPlatformHttp(env: KapsoLineEnv, fetch?: FetchLike): Http {
  return createHttp({
    name: 'kapso conversations',
    base: () => `${platformBase(env.base)}/whatsapp/conversations`,
    headers: () =>
      Promise.resolve({
        'x-api-key': env.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      }),
    timeoutMs: CALL_MS,
    redirect: 'follow',
    errorBody: 'omit',
    errors: {
      shape: () => new Error('Kapso conversations: unexpected list body'),
      timeout: (f) => new Error(`${f.where} timed out`),
      default: failed,
    },
    fetch,
  });
}
