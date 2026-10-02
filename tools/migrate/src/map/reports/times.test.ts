// Booked start times for reported lessons, on invented bookings: exact date, then weekly rows.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell } from '../../types.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentIndex } from '../people/match.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { bookingSlots, weeklyDates } from './times.ts';

const booking = (f: Record<string, Cell>) =>
  row({ name: 'ليان', phone: '966551110001', duration_min: 45, status: 'يحتاج تأكيد', ...f });

function slots(bookings: ReturnType<typeof booking>[]) {
  const sheets = { hub_students: [studentRow({})], book_bookings: bookings };
  const people = pipeline(bundleOf(sheets), [teachersModule, guardiansModule, studentsModule]);
  return bookingSlots(bundleOf(sheets, '2026-09-30'), studentIndex(people.by('students')));
}
const at = (day: string) =>
  `${keys.student({ guardianPhone: '+966551110001', name: 'ليان' }).key}|${day}`;

describe('weeklyDates', () => {
  it('lists the booked weekdays in an inclusive range (0 = Sunday)', () => {
    // 2026-09-05 is a Saturday.
    expect(weeklyDates({ from: '2026-09-05', to: '2026-09-15', byday: [2, 6] })).toEqual([
      '2026-09-05',
      '2026-09-08',
      '2026-09-12',
      '2026-09-15',
    ]);
    expect(weeklyDates({ from: '2026-09-15', to: '2026-09-01', byday: [2] })).toEqual([]);
  });
});

describe('bookingSlots', () => {
  it('a weekly row gives its time to every booked weekday until «حتى» (or today)', () => {
    const s = slots([
      booking({
        date: '2026-09-05',
        start_time: '17:00',
        recurrence: 'أسبوعي: السبت,الثلاثاء حتى 2026-09-12',
      }),
    ]);
    expect(s.get(at('2026-09-08'))).toEqual({ time: '17:00', duration: 45 });
    expect(s.get(at('2026-09-12'))).toBeDefined();
    expect(s.get(at('2026-09-15'))).toBeUndefined(); // after «حتى»
    expect(s.get(at('2026-09-09'))).toBeUndefined(); // not a booked weekday
  });

  it('a row for that exact date beats a weekly one', () => {
    const s = slots([
      booking({ date: '2026-09-05', start_time: '17:00', recurrence: 'أسبوعي: السبت' }),
      booking({ date: '2026-09-12', start_time: '20:30', duration_min: 30 }),
    ]);
    expect(s.get(at('2026-09-12'))).toEqual({ time: '20:30', duration: 30 });
    expect(s.get(at('2026-09-19'))).toEqual({ time: '17:00', duration: 45 });
    expect(s.get(at('2026-10-03'))).toBeUndefined(); // open-ended rows stop at today
  });
});
