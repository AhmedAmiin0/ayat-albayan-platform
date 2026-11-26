import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { afterCursor, type KeysetSpec } from '@/common/db/page';

const T = 'messages';
const AT = { at: '2026-11-01T10:00:00.123456+00:00', id: '7' };

function calls(ascending: boolean, at?: typeof AT, key?: string) {
  const spec = key === undefined ? { column: 'sent_at', ascending } : { column: 'sent_at', ascending, key };
  return callsOf(spec, at);
}

function callsOf(spec: KeysetSpec, at?: typeof AT) {
  const fake = fakeDb({});
  afterCursor(fake.db.from(T).select('id'), spec, at);
  return fake.calls.filter((c) => c.method !== 'select').map((c) => [c.method, ...c.args]);
}

describe('afterCursor', () => {
  it('ascending: rows after the cursor, the key breaking ties, both orders ascending', () => {
    expect(calls(true, AT)).toEqual([
      ['gte', 'sent_at', AT.at],
      ['or', `sent_at.gt."${AT.at}",id.gt.7`],
      ['order', 'sent_at', { ascending: true }],
      ['order', 'id', { ascending: true }],
    ]);
  });

  it('descending: rows before the cursor, both orders descending', () => {
    expect(calls(false, AT, 'phone_e164')).toEqual([
      ['lte', 'sent_at', AT.at],
      ['or', `sent_at.lt."${AT.at}",phone_e164.lt.7`],
      ['order', 'sent_at', { ascending: false }],
      ['order', 'phone_e164', { ascending: false }],
    ]);
  });

  it('no cursor: the first page, ordered only', () => {
    expect(calls(false)).toEqual([
      ['order', 'sent_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
    ]);
  });

  it('inclusive: the cursor row itself starts the page, in either direction', () => {
    expect(callsOf({ column: 'sent_at', ascending: false, inclusive: true }, AT).slice(0, 2)).toEqual([
      ['lte', 'sent_at', AT.at],
      ['or', `sent_at.lt."${AT.at}",id.lte.7`],
    ]);
    expect(callsOf({ column: 'sent_at', ascending: true, inclusive: true }, AT).slice(0, 2)).toEqual([
      ['gte', 'sent_at', AT.at],
      ['or', `sent_at.gt."${AT.at}",id.gte.7`],
    ]);
  });
});
