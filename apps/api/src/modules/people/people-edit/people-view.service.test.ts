import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
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
    const view = await setup({ ...none(), students: [{ data: ROW }] }).view('s1', false);
    expect(view).toEqual({
      student: {
        id: 's1',
        code: 'AB-0183',
        name: 'سهيلة',
        phone_e164: null,
        has_login: true,
        has_records: false,
      },
      guardian: { id: 'g1', name: 'أم سهيلة', has_login: false, phones: [], students: [] },
    });
  });

  it("the student's own number (owner 2026-11-17), never among the family's numbers", async () => {
    const fake = fakeDb({
      ...none(),
      students: [{ data: { ...ROW, own: { phone_e164: '+966500000007' } } }],
    });
    const records = new StudentRecordsRepo(fake.db);
    const service = new PeopleViewService(new PeopleEditRepo(fake.db), records);
    expect((await service.view('s1', false)).student.phone_e164).toBe('+966500000007');
    const select = String(fake.argsOf('students', 'select')?.[0]);
    expect(select).toContain('own:guardian_phones!guardian_phones_student_id_fkey(phone_e164)');
    expect(fake.argsOf('students', 'is')).toEqual(['guardian.phones.student_id', null]);
  });

  it('any history row → has_records; an unknown student → 404 student_not_found', async () => {
    const busy = await setup({
      ...none(),
      subscriptions: [{ count: 2 }],
      students: [{ data: ROW }],
    }).view('s1', true);
    expect(busy.student.has_records).toBe(true);
    const gone = setup({ students: [{ data: null }] });
    await expect(gone.view('x', true)).rejects.toMatchObject({
      response: { code: 'student_not_found' },
    });
  });

  it('notes only for the admin (owner 2026-10-27): left out of every other view', async () => {
    const noted = { ...ROW, notes: 'ملاحظة', guardian: { ...FAMILY, notes: 'عائلية' } };
    const admin = await setup({ ...none(), students: [{ data: noted }] }).view('s1', true);
    expect([admin.student.notes, admin.guardian.notes]).toEqual(['ملاحظة', 'عائلية']);
    const sales = await setup({ ...none(), students: [{ data: noted }] }).view('s1', false);
    expect('notes' in sales.student || 'notes' in sales.guardian).toBe(false);
  });
});
