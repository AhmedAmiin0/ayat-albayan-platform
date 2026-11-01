import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@/common/infra/http/failure';
import { KAPSO_ENV } from './kapso.fakes';
import { reopenKapsoConversation } from './kapso-conversations';

// The Kapso profile's table (docs/36 h4), one test per key; fakes only, never Kapso.

const PHONE = '+201000000001';
const reopen = (fetch: FetchLike, timeoutMs?: number) =>
  reopenKapsoConversation({ env: KAPSO_ENV, phone: PHONE, fetch, timeoutMs });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ENDED = { data: [{ id: 'c1', status: 'ended' }] };

/** No message names the host, the query (the family's number) or the key. */
async function messageOf(fetch: FetchLike, timeoutMs?: number): Promise<string> {
  const error: unknown = await reopen(fetch, timeoutMs).catch((e: unknown) => e);
  const text = error instanceof Error ? error.message : String(error);
  [KAPSO_ENV.apiKey, '201000000001', '127.0.0.1'].forEach((secret) => {
    expect(text).not.toContain(secret);
  });
  return text;
}

describe('the Kapso Platform profile', () => {
  it('4xx and 5xx: «Kapso HTTP <status>», the body dropped', async () => {
    expect(await messageOf(async () => reply({ phone: PHONE }, 404))).toBe('Kapso HTTP 404');
    expect(await messageOf(async () => reply({ phone: PHONE }, 503))).toBe('Kapso HTTP 503');
  });

  it('a list in another shape: the list message', async () => {
    expect(await messageOf(async () => reply({ items: [] }))).toBe(
      'Kapso conversations: unexpected list body',
    );
  });

  it('a PATCH answered with no JSON is still a failure (as with res.json())', async () => {
    const fetch = vi
      .fn<FetchLike>(async () => new Response('<html>ok</html>', { status: 200 }))
      .mockResolvedValueOnce(reply(ENDED));
    expect(await messageOf(fetch)).toBe('Kapso conversations: unexpected list body');
  });

  it('a dropped connection: the call named, never the URL', async () => {
    const down = async (): Promise<Response> => Promise.reject(new TypeError('fetch failed'));
    expect(await messageOf(down)).toBe('kapso conversations GET / failed');
  });

  it('one budget for both calls: a slow list leaves the PATCH only the rest of it', async () => {
    vi.useFakeTimers();
    try {
      let patch: AbortSignal | null | undefined;
      const fetch = vi
        .fn<FetchLike>((_url, init) => {
          patch = init.signal;
          return new Promise<Response>(() => undefined);
        })
        .mockImplementationOnce(async () => {
          vi.setSystemTime(Date.now() + 80);
          return reply(ENDED);
        });
      const pending = messageOf(fetch, 100);
      await vi.advanceTimersByTimeAsync(25);
      expect(await pending).toBe('kapso conversations PATCH /c1 timed out');
      expect(patch?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
