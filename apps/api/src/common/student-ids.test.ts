import { describe, expect, it } from 'vitest';
import { fakeDb } from '../modules/guardians/fake-db';
import { STUDENT_MATCH_LIMIT, studentIdsMatching } from './student-ids';

describe('studentIdsMatching', () => {
  it('name or code contains the term (PostgREST-unsafe characters dropped), capped', async () => {
    const { db, calls } = fakeDb({ students: [{ data: [{ id: 's1' }, { id: 's2' }] }] });
    expect(await studentIdsMatching(db, 'سه,يلة')).toEqual(['s1', 's2']);
    expect(calls.find((c) => c.method === 'or')?.args).toEqual(['name.ilike.*سه يلة*,code.ilike.*سه يلة*']);
    expect(calls.find((c) => c.method === 'limit')?.args).toEqual([STUDENT_MATCH_LIMIT]);
  });

  it('a term with nothing usable is no filter (null), without a read', async () => {
    const { db, calls } = fakeDb({});
    expect(await studentIdsMatching(db, ' ,() ')).toBeNull();
    expect(calls).toEqual([]);
  });

  it('a database error is thrown', async () => {
    const { db } = fakeDb({ students: [{ error: { message: 'boom' } }] });
    await expect(studentIdsMatching(db, 'x')).rejects.toBeDefined();
  });
});
