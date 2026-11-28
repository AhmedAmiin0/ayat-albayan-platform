import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GoogleEnv } from '@/config/env/env';
import { googleEndpoints } from '@/config/env/env.google';
import { GoogleApiError } from '@/modules/platform/google-sync/google-client.port';
import { classify } from '@/modules/platform/google-sync/http/backoff';
import { GoogleHttpClient } from '@/modules/platform/google-sync/http/google-http.client';

// The token refresh and the answers the core now checks, against a local server (never Google).

interface Answer {
  status: number;
  body: string;
  delayMs?: number;
}

const DEADLINE = { timeoutMs: 200 };
const state = { refreshes: 0, expiresIn: 3600, tokenDelayMs: 0, bearers: [] as string[] };
let answer: (path: string) => Answer = () => ({ status: 200, body: '{}' });
let server: Server;
let env: GoogleEnv;

const json = (status: number, body: unknown): Answer => ({ status, body: JSON.stringify(body) });

function tokenAnswer(form: string): Answer {
  if (form.includes('refresh_token=dead')) return json(400, { error: 'invalid_grant' });
  state.refreshes += 1;
  const token = { access_token: `tok-${state.refreshes}`, expires_in: state.expiresIn };
  return { ...json(200, { ...token, token_type: 'Bearer' }), delayMs: state.tokenDelayMs };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const path = req.url ?? '';
      const isToken = path === '/token';
      if (!isToken) state.bearers.push(req.headers.authorization ?? '');
      const a = isToken ? tokenAnswer(Buffer.concat(chunks).toString()) : answer(path);
      const reply = () =>
        res.writeHead(a.status, { 'content-type': 'application/json' }).end(a.body);
      setTimeout(reply, a.delayMs ?? 0);
    });
  });
  await new Promise<void>((done) => server.listen(0, done));
  const origin = `http://localhost:${String((server.address() as AddressInfo).port)}`;
  const redirectUri = 'http://localhost:3100/integrations/google/callback';
  const client = { clientId: '1-x.apps.googleusercontent.com', clientSecret: 'fake-secret' };
  env = { ...client, redirectUri, endpoints: googleEndpoints(origin) };
});
afterAll(() => server.close());
beforeEach(() => {
  Object.assign(state, { refreshes: 0, expiresIn: 3600, tokenDelayMs: 0, bearers: [] });
  answer = () => json(200, {});
});

const ref = { calendarId: 'primary', eventId: 'e1' };

describe('GoogleHttpClient token refresh', () => {
  it('a live token is refreshed once for many calls', async () => {
    const c = new GoogleHttpClient(env, 'fake-refresh');
    await c.deleteEvent(ref);
    await c.deleteEvent(ref);
    expect(state.refreshes).toBe(1);
    expect(state.bearers).toEqual(['Bearer tok-1', 'Bearer tok-1']);
  });

  it('an expired token is refreshed before the next call', async () => {
    state.expiresIn = 1;
    const c = new GoogleHttpClient(env, 'fake-refresh');
    await c.deleteEvent(ref);
    await c.deleteEvent(ref);
    expect(state.refreshes).toBe(2);
    expect(state.bearers).toEqual(['Bearer tok-1', 'Bearer tok-2']);
  });

  it('a dead refresh token is GoogleApiError 400 invalid_grant; no API call', async () => {
    const err = await new GoogleHttpClient(env, 'dead').deleteEvent(ref).catch((e: unknown) => e);
    expect(err).toEqual(new GoogleApiError(400, 'invalid_grant'));
    expect(classify(err)).toBe('auth');
    expect(state.bearers).toEqual([]);
  });
});

describe('GoogleHttpClient deadline (the API call only)', () => {
  it('a token refresh slower than the deadline still ends in the call, new bearer', async () => {
    state.tokenDelayMs = DEADLINE.timeoutMs * 2;
    await new GoogleHttpClient(env, 'slow', DEADLINE).deleteEvent(ref);
    expect(state.refreshes).toBe(1);
    expect(state.bearers).toEqual(['Bearer tok-1']);
  });

  it('an API answer slower than the deadline is still GoogleApiError(0, network)', async () => {
    answer = () => ({ ...json(200, {}), delayMs: DEADLINE.timeoutMs * 2 });
    const c = new GoogleHttpClient(env, 'r', DEADLINE);
    const err = await c.deleteEvent(ref).catch((e: unknown) => e);
    expect(err).toEqual(new GoogleApiError(0, 'network'));
  });
});

describe('GoogleHttpClient answers', () => {
  it('an empty 204 is fine where the answer is ignored', async () => {
    answer = () => ({ status: 204, body: '' });
    await expect(new GoogleHttpClient(env, 'r').deleteEvent(ref)).resolves.toBeUndefined();
  });

  it('getFile reads 410 as null and keeps other errors', async () => {
    const c = new GoogleHttpClient(env, 'r');
    answer = () => json(410, { error: { errors: [{ reason: 'deleted' }] } });
    expect(await c.getFile('f1')).toBeNull();
    answer = () => ({ status: 500, body: '<html>oops</html>' });
    const err = await c.getFile('f1').catch((e: unknown) => e);
    expect(err).toEqual(new GoogleApiError(500, 'error'));
  });

  it('a 2xx without the id is a GoogleApiError with its status', async () => {
    answer = () => json(200, { kind: 'drive#file' });
    const c = new GoogleHttpClient(env, 'r');
    const err = await c.createFolder({ name: 'x', parentId: 'p' }).catch((e: unknown) => e);
    expect(err).toEqual(new GoogleApiError(200, 'error'));
  });

  it('missing optional fields fall back as before', async () => {
    const meta = { id: 'f1', name: 'n', mimeType: 'application/pdf' };
    answer = () => json(200, meta);
    const file = await new GoogleHttpClient(env, 'r').getFile('f1');
    expect(file).toEqual({ ...meta, trashed: false, appProperties: {} });
    answer = () => json(200, { id: 'e1' });
    const event = await new GoogleHttpClient(env, 'r').getEvent(ref);
    expect(event).toMatchObject({ id: 'e1', status: '' });
  });
});
