import { describe, expect, it } from 'vitest';
import { applySort, type Orderable, type SortSpec } from '@/common/db/list-sort/list-sort';

/** Records every `.order()` call, like a supabase builder would chain them. */
class FakeQuery implements Orderable<FakeQuery> {
  calls: [string, unknown][] = [];
  order(column: string, options?: unknown): FakeQuery {
    this.calls.push([column, options]);
    return this;
  }
}

type Key = 'name' | 'code' | 'teacher' | 'created';
const spec: SortSpec<Key> = {
  columns: {
    name: { column: 'name' },
    code: { column: 'code', nullsFirst: false },
    teacher: { column: 'name', referencedTable: 'teachers' },
    created: { column: 'created_at' },
  },
  fallback: { column: 'created_at', ascending: false },
};

describe('applySort (R-NFR-08)', () => {
  it('no sort → the fallback order only', () => {
    const q = applySort(new FakeQuery(), {}, spec);
    expect(q.calls).toEqual([['created_at', { ascending: false }]]);
  });

  it('a key alone sorts ascending, then the fallback as tiebreaker', () => {
    const q = applySort(new FakeQuery(), { sort: 'name' }, spec);
    expect(q.calls).toEqual([
      ['name', { ascending: true }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('dir desc, nullsFirst and referencedTable pass through', () => {
    expect(applySort(new FakeQuery(), { sort: 'code', dir: 'desc' }, spec).calls[0]).toEqual([
      'code',
      { ascending: false, nullsFirst: false },
    ]);
    expect(applySort(new FakeQuery(), { sort: 'teacher', dir: 'asc' }, spec).calls[0]).toEqual([
      'name',
      { ascending: true, referencedTable: 'teachers' },
    ]);
  });

  it('skips the tiebreaker when the key is the fallback column', () => {
    const q = applySort(new FakeQuery(), { sort: 'created', dir: 'asc' }, spec);
    expect(q.calls).toEqual([['created_at', { ascending: true }]]);
  });

  it('an unknown key (cast past the schema) falls back', () => {
    const q = applySort(new FakeQuery(), { sort: 'password' as Key }, spec);
    expect(q.calls).toEqual([['created_at', { ascending: false }]]);
  });
});
