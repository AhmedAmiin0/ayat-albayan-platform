import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { fakeDb } from '../../../people/guardians/fake-db';
import { BookingSettings } from '../booking.settings';
import { TeacherOptionsQueries } from './teacher-options.queries';

const setup = (on: boolean) => {
  const f = fakeDb({ teacher_availability: [{ data: [{ teacher_id: 'A' }, { teacher_id: 'A' }] }] });
  return { ...f, q: new TeacherOptionsQueries(f.db, readerOf(BookingSettings, { teachers_always_available: on })) };
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
