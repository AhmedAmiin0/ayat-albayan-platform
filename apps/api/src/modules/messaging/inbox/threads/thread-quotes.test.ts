import { QUOTE_BODY_MAX, UNAVAILABLE_QUOTE, type MessageView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { quoteOf, sameNumber, ThreadQuotes, withQuotes, type QuotedRow } from './thread-quotes';

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

  it('a message deleted for everyone (migration 992) quotes nothing of itself', () => {
    const gone = row({ body: 'سر', media_mime: 'image/jpeg', deleted_at: '2026-10-30T10:00:00Z' });
    expect(quoteOf(gone)).toMatchObject({ body: null, media_mime: null });
  });

  it('never quotes an old-CRM file\'s body (only its storage link, owner 2026-10-27): the media is named', () => {
    const link = 'https://files.crm.example/storage/v1/object/public/chat-media/account-test/inbound/1-image-1.webp';
    expect(quoteOf(row({ body: link, media_mime: 'image/webp' }))).toMatchObject({ body: null, media_mime: 'image/webp' });
    expect(quoteOf(row({ body: link })).body).toBe(link);
  });
});

describe('withQuotes', () => {
  it('attaches the quote of each answering view; one we cannot read is «unavailable»', () => {
    const views = [{ id: 'a', reply_to_message_id: 'q1' }, { id: 'b', reply_to_message_id: 'gone' }, { id: 'c' }] as MessageView[];
    const out = withQuotes(views, new Map([['q1', quoteOf(row())]]));
    expect(out.map((v) => v.reply_to)).toEqual([quoteOf(row()), UNAVAILABLE_QUOTE, undefined]);
  });

  it('a reply naming a wamid we never stored (owner 2026-10-31) gets the marker; a hidden one does not', () => {
    const never = { id: 'a', reply_to_wa_id: 'wamid.N', reply_to_message_id: null, reply_to: null } as MessageView;
    const hidden = { ...never, id: 'h', hidden: { by_name: null, at: '2026-10-31T08:00:00Z' } } as MessageView;
    const out = withQuotes([never, hidden, { id: 'c', reply_to_wa_id: null } as MessageView], new Map());
    expect(out.map((v) => v.reply_to)).toEqual([UNAVAILABLE_QUOTE, null, undefined]);
  });
});

describe('ThreadQuotes', () => {
  it('target: the quoted id and wamid, read by id AND phone', async () => {
    const f = fakeDb({ data: { id: 'q1', wa_message_id: 'wamid.Q' }, error: null });
    await expect(new ThreadQuotes(f.db).target('+966501234567', 'q1')).resolves.toEqual({ reply_to_message_id: 'q1', reply_to_wa_id: 'wamid.Q' });
    expect(f.calls).toContainEqual(['eq', 'phone_e164', '+966501234567']);
  });

  it('target: no wamid for Meta when the reply leaves from another line or number (the quote stays ours)', async () => {
    const data = { id: 'q1', wa_message_id: 'wamid.Q', line: 'notifications', number_id: null };
    const q = new ThreadQuotes(fakeDb({ data, error: null }).db);
    await expect(q.target('+966501234567', 'q1', { line: 'chat' })).resolves.toEqual({ reply_to_message_id: 'q1', reply_to_wa_id: null });
    await expect(q.target('+966501234567', 'q1', { line: 'notifications' })).resolves.toMatchObject({ reply_to_wa_id: 'wamid.Q' });
  });

  it('target: 400 reply_not_in_thread for no row (another chat) or no wamid', async () => {
    for (const data of [null, { id: 'q1', wa_message_id: null }]) {
      await expect(new ThreadQuotes(fakeDb({ data, error: null }).db).target('+966501234567', 'q1')).rejects.toMatchObject({
        response: { code: 'reply_not_in_thread' },
        status: 400,
      });
    }
  });

  it('attach: no read when nothing on the page answers a row we hold; the unknown wamid is still marked', async () => {
    const f = fakeDb({ data: [], error: null });
    const views = [{ id: 'a' }, { id: 'b', reply_to_wa_id: 'wamid.N' }] as MessageView[];
    const out = await new ThreadQuotes(f.db).attach(views, '+966501234567');
    expect(f.from).not.toHaveBeenCalled();
    expect(out.map((v) => v.reply_to)).toEqual([undefined, UNAVAILABLE_QUOTE]);
  });

  it('attach: one read of the quoted ids in this chat', async () => {
    const f = fakeDb({ data: [row()], error: null });
    const out = await new ThreadQuotes(f.db).attach([{ id: 'a', reply_to_message_id: 'q1' } as MessageView], '+966501234567');
    expect(f.calls).toContainEqual(['in', 'id', ['q1']]);
    expect(out[0]?.reply_to).toMatchObject({ id: 'q1', body: 'السلام عليكم' });
  });
});

describe('sameNumber', () => {
  it('compares numbers first, then lines; an unknown side never drops the context', () => {
    expect(sameNumber({ number_id: 'n1', line: 'chat' }, { number_id: 'n2', line: 'chat' })).toBe(false);
    expect(sameNumber({ number_id: 'n1', line: 'chat' }, { number_id: 'n1', line: 'notifications' })).toBe(true);
    expect(sameNumber({ line: 'notifications' }, { line: 'chat' })).toBe(false);
    expect(sameNumber({ line: null }, { line: 'chat' })).toBe(true);
    expect(sameNumber({ line: 'chat' }, {})).toBe(true);
  });
});
