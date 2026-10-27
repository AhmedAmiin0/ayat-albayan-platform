// Imported status (owner 2026-10-27, docs/06 «Student status»): active only with a current paid
// period or a running «مشترك» series; past payments → pending_renewal / expired; attended → pending_
// subscription; else new, whatever HUB «الحالة» says. Never trial. Invented rows; import date 10-02.
import { describe, expect, it } from 'vitest';
import { bundleOf, pipeline, reportRow, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { SourceRow } from '../../types.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { guardiansModule } from './guardians.ts';
import { studentsModule } from './students.ts';

const MODULES = [teachersModule, guardiansModule, studentsModule];
const trial = (attendance: string) => reportRow({ lesson_number_text: 'التجريبيه', attendance });
const heart = (date: string, paid = 'Paid') =>
  row({ name: 'Layan', phone: 966551110001, date, paid_status: paid }, { source: 'HEART' });
const booking = (status: string, recurrence: string | null = 'أسبوعي: السبت') =>
  row({
    name: 'ليان',
    phone: '966551110001',
    status,
    recurrence,
    date: '2026-09-05',
    start_time: '18:00',
    duration_min: 45,
    teacher: 'Abrar',
  });

function run(sheets: Record<string, SourceRow[]>, student: Record<string, string> = {}) {
  const r = pipeline(bundleOf({ hub_students: [studentRow(student)], ...sheets }), MODULES);
  const downgrade = r.issues.find((i) => i.code === 'status_downgrade');
  return { status: r.by('students')[0]?.record.columns['status'], downgrade: downgrade?.detail };
}
const statusOf = (sheets: Record<string, SourceRow[]>, student?: Record<string, string>) =>
  run(sheets, student).status;

describe('students: imported status', () => {
  it('a paid period covering the import date → active; Not paid → no payment', () => {
    expect(statusOf({ heart_subscriptions: [heart('2026-09-15')] })).toBe('active');
    expect(statusOf({ heart_subscriptions: [heart('2026-09-15', 'Not paid')] })).toBe('new');
  });

  it('a running «مشترك» weekly booking → active; one already ended → not', () => {
    expect(statusOf({ book_bookings: [booking('مشترك')] })).toBe('active');
    const ended = booking('مشترك', 'أسبوعي: السبت حتى 2026-09-20');
    expect(run({ book_bookings: [ended] })).toEqual({
      status: 'new',
      downgrade: 'subscribed_booking_not_running→new',
    });
  });

  it('a period ended within subscription_expiry_days → pending_renewal, earlier → expired', () => {
    expect(statusOf({ heart_subscriptions: [heart('2026-08-28')] })).toBe('pending_renewal');
    expect(run({ heart_subscriptions: [heart('2026-08-01')] })).toEqual({
      status: 'expired',
      downgrade: 'heart_payment_not_current→expired',
    });
  });

  it('the window follows --expiry-days (the app setting)', () => {
    const b = bundleOf({
      hub_students: [studentRow({})],
      heart_subscriptions: [heart('2026-08-01')],
    });
    const r = pipeline({ ...b, expiryDays: 45 }, MODULES);
    expect(r.by('students')[0]?.record.columns['status']).toBe('pending_renewal');
  });

  it('the newest paid period wins', () => {
    const both = [heart('2026-07-01'), heart('2026-09-20')];
    expect(statusOf({ heart_subscriptions: both })).toBe('active');
  });

  it('an attended report (trial or not) or a «تمت» booking, never paid → pending_subscription', () => {
    expect(statusOf({ hub_reports: [trial('حضرت في الموعد')] })).toBe('pending_subscription');
    expect(statusOf({ hub_reports: [trial('حضرت متأخرة')] })).toBe('pending_subscription');
    expect(statusOf({ hub_reports: [reportRow({})] })).toBe('pending_subscription');
    expect(statusOf({ book_bookings: [booking('تمت', null)] })).toBe('pending_subscription');
  });

  it('absent / excused-only reports → new', () => {
    expect(statusOf({ hub_reports: [trial('اعتذرت مسبقًا')] })).toBe('new');
    expect(run({ hub_reports: [reportRow({ attendance: 'غابت' })] })).toEqual({
      status: 'new',
      downgrade: 'reported_lessons_only→new',
    });
  });

  it('HUB «طالب حالي» alone → new (reported); nothing at all → new, never trial', () => {
    expect(run({}, { status: 'طالب حالي' })).toEqual({
      status: 'new',
      downgrade: 'hub_current_student→new',
    });
    expect(run({})).toEqual({ status: 'new', downgrade: undefined });
    expect(statusOf({ book_bookings: [booking('مؤكد', null)] })).toBe('new');
  });

  it('a sibling paying on the same phone is no payment for this child', () => {
    const sibling = row({
      name: 'Dana',
      phone: 966551110001,
      date: '2026-09-20',
      paid_status: 'Paid',
    });
    const r = pipeline(
      bundleOf({
        hub_students: [studentRow({}), studentRow({ student_name: 'دانة' })],
        heart_subscriptions: [sibling],
      }),
      MODULES,
    );
    const by = Object.fromEntries(r.by('students').map((s) => [s.record.columns['name'], s]));
    expect(by['دانة']?.record.columns['status']).toBe('active');
    expect(by['ليان']?.record.columns['status']).toBe('new');
  });
});
