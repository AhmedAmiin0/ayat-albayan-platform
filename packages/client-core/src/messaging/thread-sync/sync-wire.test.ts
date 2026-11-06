import { describe, expect, it } from 'vitest';
import { jsonText, parseThreadSync, syncMessageSchema } from './sync-wire.js';

const ID = 'c0000000-0000-4000-8000-000000000001';
const T = '2026-11-06T10:00:01.000001+00:00';
const row = { id: ID, phone_e164: '+966500000001', created_at: T, updated_at: T, body: 'hi' };
const answer = (over: object = {}) => ({
  messages: [row],
  threads: [{ phone_e164: '+966500000001', last_message_id: ID, unread_count: 2 }],
  gone: [],
  cursor: `${T}~${ID}`,
  has_more: false,
  scope: 'admin:x',
  ...over,
});

describe('parseThreadSync: the GET /threads/sync answer through the shared schema', () => {
  it('keeps every field of a row and a thread (the full views)', () => {
    const out = parseThreadSync(answer());
    expect(out.messages[0]).toMatchObject({ id: ID, body: 'hi' });
    expect(out.threads[0]).toMatchObject({ last_message_id: ID, unread_count: 2 });
    expect([out.cursor, out.has_more, out.scope]).toEqual([`${T}~${ID}`, false, 'admin:x']);
  });

  it('throws on a malformed answer (no scope, a row without its stamp)', () => {
    expect(() => parseThreadSync({ ...answer(), scope: undefined })).toThrow();
    const { updated_at: _, ...bare } = row;
    expect(() => parseThreadSync(answer({ messages: [bare] }))).toThrow();
  });
});

describe('jsonText: a stored JSON column read back through a schema', () => {
  const stored = jsonText(syncMessageSchema);

  it('round-trips a row', () => {
    expect(stored.parse(JSON.stringify(row))).toEqual(row);
  });

  it('rejects text that is not the row (corrupt or another shape)', () => {
    expect(() => stored.parse('{"id":1}')).toThrow();
    expect(() => stored.parse('not json')).toThrow();
  });
});
