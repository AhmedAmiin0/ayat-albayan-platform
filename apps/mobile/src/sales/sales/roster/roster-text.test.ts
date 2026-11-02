import { t } from '@/core/lib/i18n/i18n';
import { rosterAttendanceLine, rosterScheduleLine } from './roster-text';

const S = t.sales.allStudents;
const asma = { display_name_ar: 'أسماء حسين', display_name_en: 'Asma Hussein' };
// Sun 1, Tue 3, Thu 5 November 2026 at 08:00Z: 11:00 in Riyadh.
const weekly = [{ next: ['2026-11-01T08:00:00.000Z', '2026-11-03T08:00:00.000Z', '2026-11-05T08:00:00.000Z'], teacher: asma }];

test('the schedule line: days, the time in the viewer zone (12 / 24 h), the teacher', () => {
  expect(rosterScheduleLine({ weekly }, '24')).toBe('الأحد، الثلاثاء، الخميس · 11:00 · أسماء حسين');
  expect(rosterScheduleLine({ weekly }, '12')).toBe('الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين');
  expect(rosterScheduleLine({ weekly }, '24', 'Africa/Cairo')).toBe('الأحد، الثلاثاء، الخميس · 10:00 · أسماء حسين');
});

test('no weekly slot: «لا يوجد جدول ثابت»; an old cache without the field: nothing', () => {
  expect(rosterScheduleLine({ weekly: [] }, '24')).toBe(S.noSchedule);
  expect(rosterScheduleLine({}, '24')).toBeNull();
});

test('two groups join with «؛ »', () => {
  const sat = { next: ['2026-11-07T15:00:00.000Z'], teacher: null };
  expect(rosterScheduleLine({ weekly: [...weekly, sat] }, '24')).toBe(
    `السبت · 18:00${S.groupSeparator}الأحد، الثلاثاء، الخميس · 11:00 · أسماء حسين`,
  );
});

test('attendance: «حضر 7 من 9» of the current package or the last 30 days', () => {
  expect(rosterAttendanceLine({ attendance: { attended: 7, held: 9, basis: 'subscription' } })).toBe(
    'حضر 7 من 9 في الباقة الحالية',
  );
  expect(rosterAttendanceLine({ attendance: { attended: 2, held: 3, basis: 'recent' } })).toBe(
    'حضر 2 من 3 في آخر 30 يومًا',
  );
});

test('attendance with no held lesson, and an old cache', () => {
  expect(rosterAttendanceLine({ attendance: { attended: 0, held: 0, basis: 'subscription' } })).toBe(S.noHeldPackage);
  expect(rosterAttendanceLine({ attendance: { attended: 0, held: 0, basis: 'recent' } })).toBe(S.noHeldRecent);
  expect(rosterAttendanceLine({})).toBeNull();
});
