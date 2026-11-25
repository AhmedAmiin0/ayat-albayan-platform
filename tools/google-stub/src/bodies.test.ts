import { describe, expect, it } from 'vitest';
import { AUTH, useStub } from './test-server.ts';

const stub = useStub();
const post = (path: string, body: string) =>
  fetch(`${stub.base()}${path}`, {
    method: 'POST',
    headers: { ...AUTH, 'content-type': 'application/json' },
    body,
  });
const BAD_REQUEST = {
  error: { code: 400, status: 'INVALID_ARGUMENT', errors: [{ reason: 'badRequest' }] },
};

describe('google-stub request bodies', () => {
  it('answers 400 INVALID_ARGUMENT to a body that is not JSON', async () => {
    const res = await post('/calendar/v3/calendars/primary/events', '{not json');
    expect([res.status, await res.json()]).toEqual([400, BAD_REQUEST]);
  });

  it('answers 400 to sheet values that are not rows of cells, and appends nothing', async () => {
    const sheet = 'stubSummary00000000000002';
    const bad = await post(`/v4/spreadsheets/${sheet}/values/A1:append`, '{"values":"x"}');
    expect([bad.status, await bad.json()]).toEqual([400, BAD_REQUEST]);
    const ok = await post(`/v4/spreadsheets/${sheet}/values/A1:append`, '{"values":[["a"]]}');
    expect(await ok.json()).toEqual({ updates: { updatedRange: 'Sheet1!A2:M2' } });
  });

  it('answers 400 to a Drive folder without a name', async () => {
    const res = await post('/drive/v3/files', '{"mimeType":"application/pdf"}');
    expect([res.status, await res.json()]).toEqual([400, BAD_REQUEST]);
  });

  it('keeps every field of an event body, the ones it does not read included', async () => {
    const body = { summary: 's', colorId: '5', start: { dateTime: '2026-11-01T10:00:00Z' } };
    const res = await post('/calendar/v3/calendars/primary/events', JSON.stringify(body));
    expect(await res.json()).toMatchObject({ ...body, status: 'confirmed' });
  });

  it('revokes the default refresh token when the revoke body names none', async () => {
    expect((await fetch(`${stub.base()}/__stub/revoke`, { method: 'POST', body: '' })).status).toBe(
      200,
    );
    const res = await fetch(`${stub.base()}/token`, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'stub-refresh-token',
      }),
    });
    expect(res.status).toBe(400);
  });
});
