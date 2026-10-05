import { describe, expect, it } from 'vitest';
import type { Db } from './db/db.module';
import { applySort } from './list-sort';

/** Compile-time: a real supabase-js select builder fits `applySort` and keeps its own type. */
function sortedTeachers(db: Db) {
  const query = db.from('teachers').select('*', { count: 'exact' });
  const sorted: typeof query = applySort(query, { sort: 'name', dir: 'desc' }, {
    columns: { name: { column: 'display_name_ar' } },
    fallback: { column: 'id', ascending: true },
  });
  return sorted.range(0, 24);
}

describe('applySort with supabase-js', () => {
  it('type-checks against the query builder', () => {
    expect(typeof sortedTeachers).toBe('function');
  });
});
