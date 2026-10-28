import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { fakePhotos } from '../../../common/storage/avatars/avatars.fakes';
import { TeachersQueries } from './teachers.queries';

describe('TeachersQueries.loads', () => {
  it('counts trial and active students per teacher, reading past max_rows page by page', async () => {
    const page = (n: number, id: string) => Array.from({ length: n }, () => ({ teacher_id: id }));
    const { db } = fakeDb({ students: [{ data: page(1000, 't1') }, { data: page(2, 't2') }] });
    const loads = await new TeachersQueries(db, fakePhotos().photos).loads();
    expect([...loads]).toEqual([['t1', 1000], ['t2', 2]]);
  });

  it('pending_renewal / expired students stay on the teacher’s load (CURRENT_STUDENT_STATUSES, owner 2026-10-15)', async () => {
    const f = fakeDb({ students: [{ data: [{ teacher_id: 't1' }] }] });
    await new TeachersQueries(f.db, fakePhotos().photos).loads(['t1']);
    expect(f.calls).toContainEqual({ table: 'students', method: 'in', args: ['status', ['new', 'trial', 'pending_subscription', 'active', 'pending_renewal', 'expired']] });
  });
});
