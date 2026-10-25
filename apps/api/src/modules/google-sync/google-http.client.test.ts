import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GoogleEnv } from '../../config/env/env';
import { googleEndpoints } from '../../config/env/env.google';
import { classify } from './backoff';
import { GoogleApiError } from './google-client.port';
import { GoogleHttpClient } from './google-http.client';
import { GoogleOAuthApi } from './google-http.oauth';

// The real adapter against a local recording server (never Google): paths, auth, bodies, errors.

type Seen = { method: string; url: string; auth: string; type: string; body: string };
const seen: Seen[] = [];
let reply: (r: Seen) => [number, unknown] = () => [200, {}];
let server: Server;
let env: GoogleEnv;

const body = async (req: IncomingMessage) => {
  let s = '';
  for await (const c of req) s += (c as Buffer).toString('latin1');
  return s;
};

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const r = { method: req.method ?? '', url: req.url ?? '', auth: req.headers.authorization ?? '', type: req.headers['content-type'] ?? '', body: await body(req) };
    seen.push(r);
    const [status, json] = r.url === '/token' && !r.body.includes('refresh_token=dead') ? [200, { access_token: 'fake-access', expires_in: 3600, token_type: 'Bearer' }] : reply(r);
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
  });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  env = { clientId: '1-x.apps.googleusercontent.com', clientSecret: 'fake-secret', redirectUri: 'http://localhost:3100/integrations/google/callback', endpoints: googleEndpoints(base) };
});
afterAll(() => server.close());
beforeEach(() => {
  seen.length = 0;
  reply = () => [200, {}];
});
const api = () => seen.filter((s) => s.url !== '/token');

describe('GoogleHttpClient', () => {
  it('refreshes once, then calls Calendar with the bearer and never sends updates to guests', async () => {
    reply = () => [200, { id: 'ev1' }];
    const c = new GoogleHttpClient(env, 'fake-refresh');
    const event = { summary: 's', description: '', location: '', start: { dateTime: 'x', timeZone: 'Asia/Riyadh' }, end: { dateTime: 'y', timeZone: 'Asia/Riyadh' }, reminders: { useDefault: false as const, overrides: [] }, extendedProperties: { private: {} } };
    expect(await c.insertEvent({ calendarId: 'cal@group.calendar.google.com', event })).toEqual({ id: 'ev1' });
    expect(seen[0]?.url).toBe('/token');
    expect(seen[0]?.body).toContain('grant_type=refresh_token');
    expect(api()[0]).toMatchObject({ method: 'POST', url: '/calendar/v3/calendars/cal%40group.calendar.google.com/events?sendUpdates=none', auth: 'Bearer fake-access' });
  });

  it('404/410 read as null; 429 is a retryable GoogleApiError', async () => {
    const c = new GoogleHttpClient(env, 'fake-refresh');
    reply = () => [404, { error: { code: 404, errors: [{ reason: 'notFound' }] } }];
    expect(await c.getEvent({ calendarId: 'primary', eventId: 'gone' })).toBeNull();
    reply = () => [429, { error: { code: 429, errors: [{ reason: 'rateLimitExceeded' }] } }];
    const err = await c.listCalendars().catch((e: unknown) => e);
    expect(err).toEqual(new GoogleApiError(429, 'rateLimitExceeded'));
    expect(classify(err)).toBe('retry');
  });

  it('a dead refresh token is invalid_grant (auth: disconnect)', async () => {
    reply = () => [400, { error: 'invalid_grant' }];
    const err = await new GoogleHttpClient(env, 'dead').listCalendars().catch((e: unknown) => e);
    expect(classify(err)).toBe('auth');
  });

  it('escapes Drive query literals and uploads a multipart PDF with its appProperties', async () => {
    reply = (r) => (r.url.startsWith('/drive') ? [200, { files: [] }] : [200, { id: 'f1' }]);
    const c = new GoogleHttpClient(env, 'fake-refresh');
    await c.findFiles({ name: "O'Neil", parentId: 'p1', mimeType: 'application/pdf' });
    const q = new URL(`http://x${api()[0]?.url ?? ''}`).searchParams.get('q');
    expect(q).toBe("name = 'O\\'Neil' and trashed = false and 'p1' in parents and mimeType = 'application/pdf'");
    await c.uploadPdf({ name: 'r.pdf', parentId: 'p1', bytes: new Uint8Array([37, 80, 68, 70]), appProperties: { ab_source: 'platform' } });
    const up = api()[1];
    expect(up?.url).toBe('/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true');
    expect(up?.type).toMatch(/^multipart\/related; boundary=/);
    expect(up?.body).toContain('"appProperties":{"ab_source":"platform"}');
    expect(up?.body).toContain('%PDF');
  });

  it('appends a row USER_ENTERED and reads values with serial dates', async () => {
    reply = (r) => [200, r.method === 'GET' ? { values: [[1]] } : { updates: { updatedRange: 'Sheet1!A5:M5' } }];
    const c = new GoogleHttpClient(env, 'fake-refresh');
    expect(await c.appendRow({ spreadsheetId: 's1', range: 'A1', values: ['a'] })).toEqual({ updatedRange: 'Sheet1!A5:M5' });
    expect(api()[0]?.url).toBe('/v4/spreadsheets/s1/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS');
    expect(await c.readValues({ spreadsheetId: 's1', range: 'A2:M', render: 'UNFORMATTED_VALUE' })).toEqual([[1]]);
    expect(api()[1]?.url).toBe('/v4/spreadsheets/s1/values/A2%3AM?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER');
  });
});

describe('GoogleOAuthApi', () => {
  it('asks for offline access with the consent prompt, the exact redirect URI and the state', () => {
    const url = new URL(new GoogleOAuthApi(env).authUrl({ state: 'st', scopes: ['openid', 'email'] }));
    expect(url.pathname).toBe('/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ access_type: 'offline', prompt: 'consent', state: 'st', redirect_uri: env.redirectUri, scope: 'openid email', client_id: env.clientId });
  });
});
