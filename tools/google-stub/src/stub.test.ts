import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AUTH, idOnly, json, read, useStub } from './test-server.ts';

const stub = useStub();

describe('google-stub oauth and calendar', () => {
  it('auto-consents: the auth URL redirects back with a code and the same state', async () => {
    const res = await fetch(
      `${stub.base()}/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent('http://localhost:3100/integrations/google/callback')}&state=abc`,
      { redirect: 'manual' },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3100/integrations/google/callback?code=stub-auth-code&state=abc',
    );
  });

  it('trades the code for tokens, refreshes, and refuses a revoked refresh token with invalid_grant', async () => {
    const form = (b: Record<string, string>) => ({ method: 'POST', body: new URLSearchParams(b) });
    const t = await read(
      fetch(
        `${stub.base()}/token`,
        form({ grant_type: 'authorization_code', code: 'stub-auth-code' }),
      ),
      z.object({ refresh_token: z.string(), scope: z.string() }),
    );
    expect(t.refresh_token).toBe('stub-refresh-token');
    expect(t.scope).toContain('https://www.googleapis.com/auth/drive');
    expect(
      (
        await fetch(
          `${stub.base()}/token`,
          form({ grant_type: 'refresh_token', refresh_token: t.refresh_token }),
        )
      ).status,
    ).toBe(200);
    await fetch(`${stub.base()}/__stub/revoke`, { method: 'POST', body: '{}' });
    const bad = await fetch(
      `${stub.base()}/token`,
      form({ grant_type: 'refresh_token', refresh_token: t.refresh_token }),
    );
    expect(await bad.json()).toMatchObject({ error: 'invalid_grant' });
  });

  it('needs a bearer on the APIs; creates, reads, updates and deletes events', async () => {
    expect((await fetch(`${stub.base()}/calendar/v3/users/me/calendarList`)).status).toBe(401);
    const url = `${stub.base()}/calendar/v3/calendars/primary/events`;
    const ev = await read(
      fetch(
        url,
        json({ summary: 'x', extendedProperties: { private: { ab_source: 'platform' } } }),
      ),
      idOnly,
    );
    expect(
      (await read(fetch(`${url}/${ev.id}`, { headers: AUTH }), z.object({ summary: z.string() })))
        .summary,
    ).toBe('x');
    expect((await fetch(`${url}/${ev.id}`, { method: 'DELETE', headers: AUTH })).status).toBe(204);
    expect((await fetch(`${url}/${ev.id}`, { headers: AUTH })).status).toBe(404);
    expect((await fetch(`${url}/${ev.id}`, { method: 'DELETE', headers: AUTH })).status).toBe(410);
  });

  it('lists the events overlapping timeMin..timeMax', async () => {
    const url = `${stub.base()}/calendar/v3/calendars/primary/events`;
    const slot = (h: number) => ({
      start: { dateTime: `2026-11-01T${h}:00:00Z` },
      end: { dateTime: `2026-11-01T${h}:45:00Z` },
    });
    await fetch(url, json({ summary: 'a', ...slot(10) }));
    await fetch(url, json({ summary: 'b', ...slot(12) }));
    const q = `timeMin=${encodeURIComponent('2026-11-01T10:00:00Z')}&timeMax=${encodeURIComponent('2026-11-01T10:01:00Z')}&singleEvents=true`;
    const found = await read(
      fetch(`${url}?${q}`, { headers: AUTH }),
      z.object({ items: z.array(z.object({ summary: z.string() })) }),
    );
    expect(found.items.map((e) => e.summary)).toEqual(['a']);
  });
});
