import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { GraphEnv } from '@/config/env/env';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { kapsoPlatformHttp } from '@/modules/messaging/whatsapp/drivers/kapso/kapso-platform.http';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { Http } from '@/common/infra/http/http.types';
import { graphDownload, graphHttp, graphSend, type FetchLike } from './graph';

// docs/36 h8b (2): a keyed Kapso profile never follows a redirect (undici keeps `x-api-key` on a
// cross-origin redirect); Meta's profiles and the no-credential download keep following.

const ANY = z.unknown();

type Redirect = RequestInit['redirect'];

/** Records the redirect mode of each request, answers {}. */
function recorder(): { fetch: FetchLike; modes: Redirect[] } {
  const modes: Redirect[] = [];
  const fetch: FetchLike = (_url, init) => {
    modes.push(init.redirect);
    return Promise.resolve(new Response('{}', { status: 200 }));
  };
  return { fetch, modes };
}

type Make = (fetch: FetchLike, env: GraphEnv) => Http;
const conn = (fetch: FetchLike, env: GraphEnv) => ({ env, fetch, timeoutMs: 1_000 });

interface Case {
  name: string;
  make: Make;
  env: GraphEnv;
  mode: Redirect;
}

const PROFILES: Case[] = [
  { name: 'graphHttp on Kapso', make: (f, e) => graphHttp(conn(f, e)), env: KAPSO_ENV, mode: 'error' },
  { name: 'graphSend on Kapso', make: (f, e) => graphSend(conn(f, e)), env: KAPSO_ENV, mode: 'error' },
  { name: 'Kapso Platform API', make: (f) => kapsoPlatformHttp(KAPSO_ENV, f), env: KAPSO_ENV, mode: 'error' },
  { name: 'graphHttp on Meta', make: (f, e) => graphHttp(conn(f, e)), env: STUB_ENV, mode: 'follow' },
  { name: 'graphSend on Meta', make: (f, e) => graphSend(conn(f, e)), env: STUB_ENV, mode: 'follow' },
  { name: 'Kapso download', make: (f, e) => graphDownload(conn(f, e)), env: KAPSO_ENV, mode: 'follow' },
];

describe('Graph profiles: redirect mode by driver', () => {
  it.each(PROFILES)('$name', async ({ make, env, mode }) => {
    const r = recorder();
    await make(r.fetch, env).json({ path: 'x', schema: ANY });
    expect(r.modes).toEqual([mode]);
  });
});
