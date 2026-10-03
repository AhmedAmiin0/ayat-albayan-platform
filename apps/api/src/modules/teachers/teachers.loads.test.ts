import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { TeachersQueries } from './teachers.queries';

describe('TeachersQueries.loads', () => {
  it('counts trial and active students per teacher, reading past max_rows page by page', async () => {
    const page = (n: number, id: string) => Array.from({ length: n }, () => ({ teacher_id: id }));
    const { db } = fakeDb({ students: [{ data: page(1000, 't1') }, { data: page(2, 't2') }] });
    const loads = await new TeachersQueries(db).loads();
    expect([...loads]).toEqual([['t1', 1000], ['t2', 2]]);
  });
});
