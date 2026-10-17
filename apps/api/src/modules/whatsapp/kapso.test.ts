import { describe, expect, it } from 'vitest';
import { authHeaders, graphFetch } from './graph';
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
