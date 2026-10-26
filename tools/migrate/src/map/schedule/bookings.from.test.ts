// Calendar bookings from the import date on (owner 2026-10-26): يحتاج تأكيد → active rule whose
// lessons the platform generates unconfirmed; «حتى» → ends_on; nothing before --from.
import { describe, expect, it } from 'vitest';
import { studentRow } from '../../sources/sheets/fixtures.ts';
import { bookingSkips } from './booking-slot.ts';
import { TODAY, booking, runBookings } from './bookings.fixture.ts';

const cols = (r: ReturnType<typeof runBookings>) =>
  r.by('schedule_rules').map((d) => d.record.columns);

describe('booking rules from --from', () => {
  it('a needs-confirmation weekly row becomes an active rule; the importer adds no lesson for it', () => {
    const r = runBookings({ bookings: [booking({})] });
    expect(cols(r)).toMatchObject([
      {
        status: 'active',
        byday: [0, 2],
        start_time_local: '18:00',
        starts_on: TODAY,
        ends_on: null,
      },
    ]);
    expect(r.by('schedule_rule_students')).toHaveLength(1);
    expect(r.by('lessons')).toEqual([]);
    expect(r.issues).toEqual([]);
  });

  it('starts_on is the later of the row date and --from; ends_on is the «حتى» day', () => {
    const r = runBookings({
      from: '2026-10-28',
      bookings: [
        booking({ recurrence: 'أسبوعي: الأحد حتى 2026-12-20' }),
        booking({ name: 'سارة', phone: '966551110002', date: '2026-11-03' }),
      ],
      students: [studentRow({}), studentRow({ student_name: 'سارة', phone: '966551110002' })],
    });
    expect(cols(r)).toMatchObject([
      { starts_on: '2026-10-28', ends_on: '2026-12-20' },
      { starts_on: '2026-11-03', ends_on: null },
    ]);
  });

  it('a series that ended before --from creates nothing and is counted, not reported', () => {
    const ended = booking({ status: 'مؤكد', recurrence: 'أسبوعي: السبت حتى 2026-10-20' });
    const r = runBookings({ bookings: [ended] });
    expect(r.by('schedule_rules')).toEqual([]);
    expect(r.by('lessons')).toEqual([]);
    expect(r.issues).toEqual([]);
    const sheets = { book_bookings: [ended] };
    expect(bookingSkips({ sheets, from: TODAY })).toEqual({ ended_before_from: 1 });
  });

  it('«ملغي», «مبدئي» and «تمت» rows create nothing, weekly or one-off', () => {
    const rows = ['ملغي', 'مبدئي', 'تمت'].flatMap((status) => [
      booking({ status }),
      booking({ status, recurrence: null, date: '2026-11-01' }),
    ]);
    const r = runBookings({ bookings: rows });
    expect([...r.by('schedule_rules'), ...r.by('lessons'), ...r.by('lesson_students')]).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(bookingSkips({ sheets: { book_bookings: rows }, from: TODAY })).toEqual({
      status_not_synced: 6,
    });
  });

  it('a row with no date or time is reported, not imported', () => {
    const r = runBookings({
      bookings: [booking({ date: null }), booking({ recurrence: null, start_time: null })],
    });
    expect(r.issues.map((i) => [i.entity, i.code, i.severity])).toEqual([
      ['schedule_rules', 'missing_field', 'reject'],
      ['lessons', 'missing_field', 'reject'],
    ]);
  });

  it('test rows and bad phones are still rejected', () => {
    const r = runBookings({
      bookings: [
        booking({ name: 'Lorem ipsum' }),
        booking({ phone: '@SomeHandle1' }),
        booking({ recurrence: null, date: '2026-11-01', name: 'TEST' }),
        booking({ recurrence: null, date: '2026-11-01', phone: '0123' }),
      ],
    });
    expect(r.by('schedule_rules')).toEqual([]);
    expect(r.by('lessons')).toEqual([]);
    expect(r.issues.map((i) => [i.entity, i.code])).toEqual([
      ['schedule_rules', 'test_row'],
      ['schedule_rules', 'bad_phone'],
      ['lessons', 'test_row'],
      ['lessons', 'bad_phone'],
    ]);
  });
});
