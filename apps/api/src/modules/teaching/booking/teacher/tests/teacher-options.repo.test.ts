import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import {
  TeacherOptionsRepo,
  type TeacherFilter,
} from '@/modules/teaching/booking/teacher/teacher-options.repo';

const SETTINGS = readerOf(BookingSettings);
const FILTER: TeacherFilter = { program: 'quran' };
const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const setup = (on: boolean) => {
  const f = fakeDb({
    teacher_availability: [{ data: [{ teacher_id: 'A' }, { teacher_id: 'A' }] }],
  });
  return {
    ...f,
    q: new TeacherOptionsRepo(f.db, readerOf(BookingSettings, { teachers_always_available: on })),
  };
};

describe('TeacherOptionsQueries.withAvailability (R-SCH-06)', () => {
  it('24/7 on: every teacher can be picked, no availability query', async () => {
    const { q, calls } = setup(true);
    expect(await q.withAvailability(['A', 'B'])).toEqual(new Set(['A', 'B']));
    expect(calls).toEqual([]);
  });

  it('24/7 off: only teachers with a saved weekly row', async () => {
    const { q, argsOf } = setup(false);
    expect(await q.withAvailability(['A', 'B'])).toEqual(new Set(['A']));
    expect(argsOf('teacher_availability', 'in')).toEqual(['teacher_id', ['A', 'B']]);
  });
});

describe('TeacherOptionsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new TeacherOptionsRepo(db, SETTINGS).active(FILTER))).toEqual(
      DUPLICATE,
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ teachers: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new TeacherOptionsRepo(db, SETTINGS).active(FILTER))).toEqual(
      FAILED,
    );
  });
});
