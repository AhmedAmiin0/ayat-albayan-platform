import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStub } from './stub.ts';

let server: Server;
let base = '';
const AUTH = { authorization: 'Bearer stub-access-token' };
const json = (body: unknown) => ({ method: 'POST', headers: { ...AUTH, 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(async () => {
  const stub = createStub();
  server = createServer((req, res) => void stub.handle(req, res));
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterEach(() => server.close());

describe('google-stub', () => {
  it('auto-consents: the auth URL redirects back with a code and the same state', async () => {
    const res = await fetch(`${base}/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent('http://localhost:3100/integrations/google/callback')}&state=abc`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3100/integrations/google/callback?code=stub-auth-code&state=abc');
  });

  it('trades the code for tokens, refreshes, and refuses a revoked refresh token with invalid_grant', async () => {
    const form = (b: Record<string, string>) => ({ method: 'POST', body: new URLSearchParams(b) });
    const t = await (await fetch(`${base}/token`, form({ grant_type: 'authorization_code', code: 'stub-auth-code' }))).json() as { refresh_token: string; scope: string };
    expect(t.refresh_token).toBe('stub-refresh-token');
    expect(t.scope).toContain('https://www.googleapis.com/auth/drive');
    expect((await fetch(`${base}/token`, form({ grant_type: 'refresh_token', refresh_token: t.refresh_token }))).status).toBe(200);
    await fetch(`${base}/__stub/revoke`, { method: 'POST', body: '{}' });
    const bad = await fetch(`${base}/token`, form({ grant_type: 'refresh_token', refresh_token: t.refresh_token }));
    expect(await bad.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('needs a bearer on the APIs; creates, reads, updates and deletes events', async () => {
    expect((await fetch(`${base}/calendar/v3/users/me/calendarList`)).status).toBe(401);
    const url = `${base}/calendar/v3/calendars/primary/events`;
    const ev = await (await fetch(url, json({ summary: 'x', extendedProperties: { private: { ab_source: 'platform' } } }))).json() as { id: string };
    expect((await (await fetch(`${url}/${ev.id}`, { headers: AUTH })).json() as { summary: string }).summary).toBe('x');
    expect((await fetch(`${url}/${ev.id}`, { method: 'DELETE', headers: AUTH })).status).toBe(204);
    expect((await fetch(`${url}/${ev.id}`, { headers: AUTH })).status).toBe(404);
    expect((await fetch(`${url}/${ev.id}`, { method: 'DELETE', headers: AUTH })).status).toBe(410);
  });

  it('finds the seeded root folder and summary sheet by Drive query, appends and reads values', async () => {
    const q = (s: string) => `${base}/drive/v3/files?q=${encodeURIComponent(s)}`;
    const roots = await (await fetch(q("name = 'تقارير آيات البيان' and trashed = false and mimeType = 'application/vnd.google-apps.folder'"), { headers: AUTH })).json() as { files: { id: string }[] };
    expect(roots.files).toHaveLength(1);
    const sheets = await (await fetch(q(`name = 'سجل الطلاب المشتركين' and '${roots.files[0]?.id}' in parents`), { headers: AUTH })).json() as { files: { id: string }[] };
    const id = sheets.files[0]?.id ?? '';
    const app = await (await fetch(`${base}/v4/spreadsheets/${id}/values/A1:append`, json({ values: [['طالب', 'T']] }))).json() as { updates: { updatedRange: string } };
    expect(app.updates.updatedRange).toBe('Sheet1!A2:M2');
    const read = await (await fetch(`${base}/v4/spreadsheets/${id}/values/${encodeURIComponent('A2:H')}`, { headers: AUTH })).json() as { values: unknown[][] };
    expect(read.values).toEqual([['طالب', 'T']]);
  });

  it('uploads a multipart PDF with its appProperties and lists it in /__stub/state', async () => {
    const boundary = 'b1';
    const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: 'r.pdf', parents: ['p'], appProperties: { ab_source: 'platform' } })}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--${boundary}--`;
    const res = await fetch(`${base}/upload/drive/v3/files?uploadType=multipart`, { method: 'POST', headers: { ...AUTH, 'content-type': `multipart/related; boundary=${boundary}` }, body });
    expect(res.status).toBe(200);
    const state = await (await fetch(`${base}/__stub/state`)).json() as { files: { name: string; appProperties: Record<string, string> }[] };
    expect(state.files.find((f) => f.name === 'r.pdf')?.appProperties).toEqual({ ab_source: 'platform' });
  });
});
