import { describe, expect, it } from 'vitest';
import { applySort, type Orderable, type SortSpec } from '@/common/db/list-sort/list-sort';

class FakeQuery implements Orderable<FakeQuery> {
  calls: [string, unknown][] = [];
  order(column: string, options?: unknown): this {
    this.calls.push([column, options]);
    return this;
  }
}

type Key = 'name' | 'inbound';
const leadsLike: SortSpec<Key> = {
  columns: {
    name: { column: 'name', nullsFirst: false },
    inbound: { column: 'last_inbound_at', nullsFirst: false },
  },
  fallback: [
    { column: 'last_inbound_at', ascending: false, nullsFirst: false },
    { column: 'created_at', ascending: false },
  ],
};

describe('applySort stable order', () => {
  it('the default order is every fallback column, then the unique id', () => {
    expect(applySort(new FakeQuery(), {}, leadsLike).calls).toEqual([
      ['last_inbound_at', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('a requested key keeps the fallback after it, without repeating its own column', () => {
    expect(applySort(new FakeQuery(), { sort: 'inbound', dir: 'asc' }, leadsLike).calls).toEqual([
      ['last_inbound_at', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('a relation without an id names its own unique key', () => {
    const threads: SortSpec<Key> = { ...leadsLike, key: 'phone_e164' };
    expect(applySort(new FakeQuery(), { sort: 'name' }, threads).calls.at(-1)).toEqual([
      'phone_e164',
      { ascending: true },
    ]);
  });

  it('does not order twice by the key when the fallback already ends on it', () => {
    const byId: SortSpec<Key> = { ...leadsLike, fallback: [{ column: 'id', ascending: false }] };
    expect(applySort(new FakeQuery(), {}, byId).calls).toEqual([['id', { ascending: false }]]);
  });
});
