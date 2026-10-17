import { describe, expect, it } from 'vitest';
import { WaError } from './whatsapp.types';
import { authHeaders, byDriver, graphFetch } from './graph';
import { failurePlan } from './send-plan';
import { nextTemplateCursor, templateEditPath } from './kapso';
import { KAPSO_ENV, kapsoFetch } from './kapso.fakes';
import { STUB_ENV } from './whatsapp.fakes';

// docs/19: the per-driver pieces, pure.

describe('authHeaders per driver', () => {
  it('meta = the bearer; kapso = X-API-Key and never an authorization header', () => {
    expect(authHeaders(STUB_ENV)).toEqual({ authorization: 'Bearer test-token' });
    expect(authHeaders({ ...STUB_ENV, provider: 'meta' })).toEqual({ authorization: 'Bearer test-token' });
    expect(authHeaders(KAPSO_ENV)).toEqual({ 'x-api-key': 'fake-kapso-key' });
  });

  it('graphFetch with auth:false sends no credential at all, on either driver', async () => {
    for (const env of [STUB_ENV, KAPSO_ENV]) {
      const f = kapsoFetch({ bytes: new Uint8Array([7]) });
      await graphFetch({ env, fetch: f.fetch, timeoutMs: 1_000 }, { path: 'https://files.example.test/x?token=t', auth: false });
      expect(f.requests[0]?.headers).toEqual({});
    }
  });
});

describe('nextTemplateCursor', () => {
  const page = (count: number, paging?: { next?: string; cursors?: { after?: string } }) => ({ count, limit: 100, ...(paging ? { paging } : {}) });

  it('meta follows `after` only while paging.next says there is more', () => {
    expect(nextTemplateCursor(STUB_ENV, page(100, { next: 'https://x/next', cursors: { after: 'c1' } }))).toBe('c1');
    expect(nextTemplateCursor(STUB_ENV, page(100, { cursors: { after: 'c1' } }))).toBeUndefined();
    expect(nextTemplateCursor(STUB_ENV, page(3))).toBeUndefined();
  });

  it('kapso (no paging.next) follows `after` while the page is full', () => {
    expect(nextTemplateCursor(KAPSO_ENV, page(100, { cursors: { after: 'c1' } }))).toBe('c1');
    expect(nextTemplateCursor(KAPSO_ENV, page(99, { cursors: { after: 'c1' } }))).toBeUndefined();
    expect(nextTemplateCursor(KAPSO_ENV, page(100, { cursors: {} }))).toBeUndefined();
    expect(nextTemplateCursor(KAPSO_ENV, page(0))).toBeUndefined();
  });
});

describe('templateEditPath', () => {
  it('meta POSTs to /{template id}; kapso to /{waba}/message_templates?hsm_id=', () => {
    expect(templateEditPath(STUB_ENV, '123')).toBe('123');
    expect(templateEditPath(KAPSO_ENV, '123')).toBe('stub-waba/message_templates?hsm_id=123');
    expect(templateEditPath(KAPSO_ENV, 'a&b')).toBe('stub-waba/message_templates?hsm_id=a%26b');
  });
});

describe('byDriver: Kapso refusing its key is the credential class', () => {
  const err = (status: number, code: number | null) => new WaError('x', { code, status });
  const now = new Date('2026-10-17T12:00:00Z');

  it('kapso 401/403 without a Meta code becomes 190, so the sender holds the queue', () => {
    for (const e of [err(401, null), err(401, 401), err(403, null)]) {
      const tagged = byDriver(KAPSO_ENV, e);
      expect(tagged.info.code).toBe(190);
      expect(failurePlan({ error: tagged, attempts: 1, now })).toMatchObject({ status: 'queued', attempts: 0 });
    }
  });

  it('Meta lines, other statuses and real Meta codes pass through unchanged', () => {
    const meta401 = err(401, null);
    expect(byDriver(STUB_ENV, meta401)).toBe(meta401);
    for (const e of [err(400, 131047), err(404, null), err(403, 10), err(401, 190), err(403, 131031)]) expect(byDriver(KAPSO_ENV, e)).toBe(e);
  });

  it('graphFetch applies it to a Kapso 401 answer', async () => {
    const f = kapsoFetch({ status: 401, body: { error: 'Unauthorized' } });
    const e = await graphFetch({ env: KAPSO_ENV, fetch: f.fetch, timeoutMs: 1_000 }, { path: 'x' }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info).toMatchObject({ code: 190, status: 401 });
  });
});
