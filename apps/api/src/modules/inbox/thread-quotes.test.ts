import { QUOTE_BODY_MAX, type MessageView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { quoteOf, ThreadQuotes, withQuotes, type QuotedRow } from './thread-quotes';

const row = (over: Partial<QuotedRow> = {}): QuotedRow => ({
  id: 'q1', direction: 'inbound', body: 'السلام عليكم', media_mime: null, template_key: null, sender: null, ...over,
});

/** A PostgREST chain whose terminal call answers `result`; `calls` records the filters. */
function fakeDb(result: { data: unknown; error: null | { message: string } }) {
  const calls: unknown[][] = [];
  // Every step is awaitable (attach awaits the chain itself, target its maybeSingle()).
  const step = (name: string) => (...a: unknown[]) => {
    calls.push([name, ...a]);
    return chain;
  };
  const chain: object = Object.assign(Promise.resolve(result), {
    maybeSingle: () => Promise.resolve(result),
    select: step('select'),
    eq: step('eq'),
    in: step('in'),
  });
  const from = vi.fn(() => chain);
  return { db: { from } as unknown as Db, from, calls };
}

describe('quoteOf', () => {
  it("never quotes a template's text; cuts a long text; names our sender only", () => {
    expect(quoteOf(row({ template_key: 'lesson_join_link', body: 'https://x' })).body).toBeNull();
    expect(quoteOf(row({ body: 'ا'.repeat(500) })).body).toHaveLength(QUOTE_BODY_MAX);
    expect(quoteOf(row({ direction: 'outbound', sender: { full_name: 'سارة' } })).sender_name).toBe('سارة');
    expect(quoteOf(row({ sender: { full_name: 'سارة' } })).sender_name).toBeNull();
  });
});

describe('withQuotes', () => {
  it('attaches the quote of each answering view; an unknown one becomes null', () => {
    const views = [{ id: 'a', reply_to_message_id: 'q1' }, { id: 'b', reply_to_message_id: 'gone' }, { id: 'c' }] as MessageView[];
    const out = withQuotes(views, new Map([['q1', quoteOf(row())]]));
    expect(out.map((v) => v.reply_to?.id ?? v.reply_to)).toEqual(['q1', null, undefined]);
  });
});

describe('ThreadQuotes', () => {
  it('target: the quoted id and wamid, read by id AND phone', async () => {
    const f = fakeDb({ data: { id: 'q1', wa_message_id: 'wamid.Q' }, error: null });
    await expect(new ThreadQuotes(f.db).target('+966501234567', 'q1')).resolves.toEqual({ reply_to_message_id: 'q1', reply_to_wa_id: 'wamid.Q' });
    expect(f.calls).toContainEqual(['eq', 'phone_e164', '+966501234567']);
  });

  it('target: 400 reply_not_in_thread for no row (another chat) or no wamid', async () => {
    for (const data of [null, { id: 'q1', wa_message_id: null }]) {
      await expect(new ThreadQuotes(fakeDb({ data, error: null }).db).target('+966501234567', 'q1')).rejects.toMatchObject({
        response: { code: 'reply_not_in_thread' },
        status: 400,
      });
    }
  });

  it('attach: no read when nothing on the page answers anything', async () => {
    const f = fakeDb({ data: [], error: null });
    await new ThreadQuotes(f.db).attach([{ id: 'a' } as MessageView], '+966501234567');
    expect(f.from).not.toHaveBeenCalled();
  });

  it('attach: one read of the quoted ids in this chat', async () => {
    const f = fakeDb({ data: [row()], error: null });
    const out = await new ThreadQuotes(f.db).attach([{ id: 'a', reply_to_message_id: 'q1' } as MessageView], '+966501234567');
    expect(f.calls).toContainEqual(['in', 'id', ['q1']]);
    expect(out[0]?.reply_to).toMatchObject({ id: 'q1', body: 'السلام عليكم' });
  });
});
