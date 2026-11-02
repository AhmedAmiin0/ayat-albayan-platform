import { describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '../../whatsapp/drivers/meta/graph';
import { KAPSO_FIELDS, KapsoHistory, PAGE_LIMIT } from './kapso-history';
import { kapsoEnv, kapsoText } from './external.fakes';

// Kapso's history reads through a fake fetch: no call ever leaves the test.

function reader(body: unknown, status = 200) {
  const fetch = vi.fn<FetchLike>(async () => new Response(JSON.stringify(body), { status }));
  return { fetch, kapso: new KapsoHistory(fetch) };
}
const urlOf = (f: ReturnType<typeof reader>['fetch']) => new URL(String(f.mock.calls[0]?.[0]));
const headersOf = (f: ReturnType<typeof reader>['fetch']) => f.mock.calls[0]?.[1]?.headers as Record<string, string>;

describe('KapsoHistory', () => {
  it('GET {phone_number_id}/messages/{wamid} with the project key (never a bearer) and the kapso fields', async () => {
    const { fetch, kapso } = reader({ data: kapsoText() });
    expect(await kapso.message(kapsoEnv(), 'wamid.EXT1')).toMatchObject({ id: 'wamid.EXT1' });
    const url = urlOf(fetch);
    expect(url.pathname).toBe('/kapso/v24.0/kapso-chat-1/messages/wamid.EXT1');
    expect(url.searchParams.get('fields')).toBe(KAPSO_FIELDS);
    expect(headersOf(fetch)).toMatchObject({ 'x-api-key': 'fake-kapso-key' });
    expect(headersOf(fetch)).not.toHaveProperty('authorization');
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET');
  });

  it('accepts the message itself as the body; null when there is none', async () => {
    expect(await reader(kapsoText()).kapso.message(kapsoEnv(), 'w')).toMatchObject({ id: 'wamid.EXT1' });
    expect(await reader({ data: null }).kapso.message(kapsoEnv(), 'w')).toBeNull();
  });

  it('throws Kapso\'s HTTP error (the caller logs it)', async () => {
    await expect(reader({ error: { message: 'nope', code: 100 } }, 404).kapso.message(kapsoEnv(), 'w')).rejects.toThrow('nope');
  });

  it('a page of outbound since a time; a full page with a cursor has more', async () => {
    const full = Array.from({ length: PAGE_LIMIT }, (_, i) => kapsoText({ id: `w${i}` }));
    const { fetch, kapso } = reader({ data: full, paging: { cursors: { after: 'c2' } } });
    const res = await kapso.outbound(kapsoEnv(), { since: '2026-10-25T00:00:00.000Z', after: 'c1' });
    expect(res).toMatchObject({ after: 'c2' });
    expect(res.messages).toHaveLength(PAGE_LIMIT);
    const q = urlOf(fetch).searchParams;
    expect(Object.fromEntries(q)).toEqual({ direction: 'outbound', since: '2026-10-25T00:00:00.000Z', limit: String(PAGE_LIMIT), fields: KAPSO_FIELDS, after: 'c1' });
  });

  it('a short page is the last one', async () => {
    const res = await reader({ data: [kapsoText()], paging: { cursors: { after: 'c2' } } }).kapso.outbound(kapsoEnv(), { since: 'x' });
    expect(res.after).toBeUndefined();
    expect((await reader({}).kapso.outbound(kapsoEnv(), { since: 'x' })).messages).toEqual([]);
  });

  it('a page of the families\' messages asks direction=inbound, same paging', async () => {
    const { fetch, kapso } = reader({ data: [kapsoText()], paging: { cursors: { after: 'c2' } } });
    const res = await kapso.inbound(kapsoEnv(), { since: '2026-10-30T08:49:00.000Z' });
    expect(res).toEqual({ messages: [kapsoText()], after: undefined });
    const q = urlOf(fetch).searchParams;
    expect(q.get('direction')).toBe('inbound');
    expect(q.get('since')).toBe('2026-10-30T08:49:00.000Z');
  });
});
