import { describe, expect, it } from 'vitest';
import { TS_DATE } from '@/modules/messaging/webhook/tests/meta.fakes';
import { field, first, get, list, metaTime } from '@/modules/messaging/webhook/parse/webhook.fields';

const NOW = new Date('2026-10-03T13:05:00Z');
const body = { errors: [{ code: 131051, title: 'Unsupported' }], text: { body: 'hi' }, n: null };

describe('get — a dotted path into parsed JSON', () => {
  it('walks objects and array indexes', () => {
    expect(get(body, 'errors.0.code')).toBe(131051);
    expect(get(body, 'text')).toEqual({ body: 'hi' });
  });

  it('is undefined past a missing key, a null, a string or a non-object root', () => {
    expect(get(body, 'errors.1.code')).toBeUndefined();
    expect(get(body, 'n.x')).toBeUndefined();
    expect(get(body, 'text.body.length')).toBeUndefined();
    expect(get(undefined, 'a')).toBeUndefined();
    expect(get(42, 'a')).toBeUndefined();
  });
});

describe('field — a string, or a number as text', () => {
  it('reads strings and numbers', () => {
    expect(field(body, 'text.body')).toBe('hi');
    expect(field(body, 'errors.0.code')).toBe('131051');
  });

  it('is null for objects, null, booleans and missing paths', () => {
    expect(field(body, 'text')).toBeNull();
    expect(field(body, 'n')).toBeNull();
    expect(field({ ok: true }, 'ok')).toBeNull();
    expect(field(body, 'nope')).toBeNull();
  });
});

describe('list and first', () => {
  it('list keeps arrays and turns anything else into []', () => {
    expect(list([1, 2])).toEqual([1, 2]);
    expect(list({ 0: 1 })).toEqual([]);
    expect(list(undefined)).toEqual([]);
  });

  it('first is the first non-null value, or null', () => {
    expect(first(null, 'a', 'b')).toBe('a');
    expect(first('', 'a')).toBe('');
    expect(first(null, null)).toBeNull();
  });
});

describe('metaTime', () => {
  it('metaTime falls back to now for a missing or bad timestamp', () => {
    expect(metaTime(undefined, NOW)).toBe(NOW);
    expect(metaTime('abc', NOW)).toBe(NOW);
    expect(metaTime('1791032400', NOW)).toEqual(TS_DATE);
  });
});
