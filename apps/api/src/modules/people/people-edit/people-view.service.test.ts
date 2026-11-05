import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { none } from '@/modules/people/people-edit/testing/people-edit.test-app';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleViewService } from './people-view.service';
import { StudentRecordsRepo } from './student-records.repo';

const FAMILY = { id: 'g1', name: 'أم سهيلة', profile_id: null, phones: [], students: [] };
const ROW = { id: 's1', code: 'AB-0183', name: 'سهيلة', profile_id: 'p1', guardian: FAMILY };

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  return new PeopleViewService(new PeopleEditRepo(fake.db), new StudentRecordsRepo(fake.db));
}

describe('PeopleViewService, GET /people/students/:id', () => {
  it('the logins and the history as yes / no, never a profile id', async () => {
    const view = await setup({ ...none(), students: [{ data: ROW }] }).view('s1');
    expect(view).toEqual({
      student: { id: 's1', code: 'AB-0183', name: 'سهيلة', has_login: true, has_records: false },
      guardian: { id: 'g1', name: 'أم سهيلة', has_login: false, phones: [], students: [] },
    });
  });

  it('any history row → has_records; an unknown student → 404 student_not_found', async () => {
    const busy = await setup({
      ...none(),
      subscriptions: [{ count: 2 }],
      students: [{ data: ROW }],
    }).view('s1');
    expect(busy.student.has_records).toBe(true);
    const gone = setup({ students: [{ data: null }] });
    await expect(gone.view('x')).rejects.toMatchObject({ response: { code: 'student_not_found' } });
  });
});
