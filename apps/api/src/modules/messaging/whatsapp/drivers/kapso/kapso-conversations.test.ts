import { describe, expect, it } from 'vitest';
import { KAPSO_ENV } from './kapso.fakes';
import { newest, reopenKapsoConversation } from './kapso-conversations';
import { platformBase } from './kapso-platform.http';

// Fakes only: a scripted fetch, never Kapso.

const PHONE = '+201000000001';

function scripted(...replies: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; body: unknown; key: unknown }[] = [];
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    const headers = init.headers as Record<string, string>;
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : null, key: headers['x-api-key'] });
    const reply = replies.shift();
    if (!reply) throw new Error(`unscripted ${url}`);
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  };
  return { fetch, calls };
}

describe('Kapso conversations (Platform API v1)', () => {
  it('the Platform API sits next to the Meta proxy', () => {
    expect(platformBase('https://kapso.example.test/meta/whatsapp/')).toBe('https://kapso.example.test/platform/v1');
    expect(platformBase('http://127.0.0.1:4010/kapso')).toBe('http://127.0.0.1:4010/kapso/platform/v1');
  });

  it('lists the phone\'s conversations on the line\'s number and PATCHes the newest, when ended, to active', async () => {
    const { fetch, calls } = scripted(
      { status: 200, body: { data: [{ id: 'c-old', status: 'ended', last_active_at: '2026-10-01T00:00:00Z' }, { id: 'c-new', status: 'ended', last_active_at: '2026-10-20T00:00:00Z' }] } },
      { status: 200, body: { data: { id: 'c-new', status: 'active' } } },
    );
    expect(await reopenKapsoConversation({ env: KAPSO_ENV, phone: PHONE, fetch })).toBe(true);
    const list = new URL(calls[0]?.url ?? '');
    expect(list.pathname).toBe('/kapso/platform/v1/whatsapp/conversations');
    expect(Object.fromEntries(list.searchParams)).toEqual({ phone_number: '201000000001', phone_number_id: KAPSO_ENV.phoneNumberId, limit: '5' });
    expect(calls[1]).toEqual({
      url: 'http://127.0.0.1:4010/kapso/platform/v1/whatsapp/conversations/c-new',
      method: 'PATCH',
      body: { whatsapp_conversation: { status: 'active' } },
      key: KAPSO_ENV.apiKey,
    });
    expect(calls[0]?.key).toBe(KAPSO_ENV.apiKey);
  });

  it('newest already active: no PATCH and false; the older ended one stays ended (a second reopen is a no-op)', async () => {
    const { fetch, calls } = scripted({
      status: 200,
      body: { data: [{ id: 'c-old', status: 'ended', last_active_at: '2026-10-01T00:00:00Z' }, { id: 'c-new', status: 'active', last_active_at: '2026-10-20T00:00:00Z' }] },
    });
    expect(await reopenKapsoConversation({ env: KAPSO_ENV, phone: PHONE, fetch })).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('no conversation: no PATCH', async () => {
    const { fetch, calls } = scripted({ status: 200, body: { data: [] } });
    expect(await reopenKapsoConversation({ env: KAPSO_ENV, phone: PHONE, fetch })).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('a Kapso error throws without its body (it may name the family)', async () => {
    const { fetch } = scripted({ status: 500, body: { error: `no conversation for ${PHONE}` } });
    await expect(reopenKapsoConversation({ env: KAPSO_ENV, phone: PHONE, fetch })).rejects.toThrow(/^Kapso HTTP 500$/);
  });

  it('newest falls back to updated_at, then created_at', () => {
    expect(newest([{ id: 'a', created_at: '2026-10-03T00:00:00Z' }, { id: 'b', updated_at: '2026-10-02T00:00:00Z' }])?.id).toBe('a');
  });
});
