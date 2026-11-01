import { describe, expect, it } from 'vitest';
import { historyPageSchema, messageSchema } from './kapso-history.schema';

// Today's walker, as schemas (docs/36 h4): the same answers for every envelope Kapso may send.

describe('messageSchema', () => {
  it('`data` holding the message: the message', () => {
    expect(messageSchema.parse({ data: { id: 'w1' } })).toEqual({ id: 'w1' });
  });

  it('the message itself as the body (no `data`, or `data` a list): the body', () => {
    expect(messageSchema.parse({ id: 'w1' })).toEqual({ id: 'w1' });
    expect(messageSchema.parse({ id: 'w1', data: [] })).toEqual({ id: 'w1', data: [] });
  });

  it('anything else is null', () => {
    [{ data: null }, { data: 'x' }, null, 'text', 7].forEach((body) => {
      expect(messageSchema.parse(body)).toBeNull();
    });
  });
});

describe('historyPageSchema', () => {
  it('the list and its cursor', () => {
    const page = historyPageSchema.parse({
      data: [{ id: 'a' }],
      paging: { cursors: { after: 'c2' } },
    });
    expect(page.data).toEqual([{ id: 'a' }]);
    expect(page.paging?.cursors.after).toBe('c2');
  });

  it('no list, a list of another type or no body: an empty page with no cursor', () => {
    [{}, { data: 'x' }, null].forEach((body) => {
      const page = historyPageSchema.parse(body);
      expect(page.data).toEqual([]);
      expect(page.paging?.cursors.after).toBeUndefined();
    });
  });

  it('a cursor that is not a string is no cursor; the list stays', () => {
    const page = historyPageSchema.parse({ data: [1], paging: { cursors: { after: 3 } } });
    expect(page).toMatchObject({ data: [1] });
    expect(page.paging?.cursors.after).toBeUndefined();
    expect(historyPageSchema.parse({ data: [1], paging: 'x' }).paging).toBeUndefined();
  });
});
