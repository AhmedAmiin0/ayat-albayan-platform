import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { TEACHER } from '@/modules/finance/teacher-earnings/earnings.fakes';
import { paymentsPage, sessionsPage } from './earnings.lists';

const V = 'v_teacher_countable_earnings';
const P = 'teacher_payments';
const filter = { page: 5, pageSize: 20 };
const empty = { items: [], total: 9, page: 5, pageSize: 20 };

describe('teacher earnings lists past the last page', () => {
  it('sessions: an empty page with the real total', async () => {
    const fake = fakeDb({ [V]: pastEnd(9) });
    expect(await sessionsPage(fake.db, { teacherId: TEACHER, filter })).toEqual(empty);
    expect(rangesOn(fake, V)).toEqual([[80, 99], [0, 0]]);
  });

  it('payments: an empty page with the real total', async () => {
    const fake = fakeDb({ [P]: pastEnd(9) });
    expect(await paymentsPage(fake.db, { teacherId: TEACHER, filter })).toEqual(empty);
    expect(rangesOn(fake, P)).toEqual([[80, 99], [0, 0]]);
  });
});
