import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { slotLine, slotsInWeekOrder, studentsLine, totalsLine } from './overview-text';

const RIYADH = 'Asia/Riyadh';
const slot = (weekday: number, time: string) => ({ rule_id: 'r', weekday, time, duration_min: 45, students: [] });

test('slots run السبت → الجمعة, by time within a day', () => {
  const out = slotsInWeekOrder([slot(0, '20:00'), slot(6, '18:00'), slot(0, '09:00')], RIYADH);
  expect(out.map((s) => [s.weekday, s.time])).toEqual([[6, '18:00'], [0, '09:00'], [0, '20:00']]);
});

test('a slot line in 24 h and 12 h', () => {
  expect(slotLine(slot(0, '20:00'), '24', RIYADH)).toBe('الأحد الساعة 20:00 · 45 دقيقة');
  expect(slotLine(slot(2, '08:30'), '12', RIYADH)).toBe('الثلاثاء الساعة 8:30 ص · 45 دقيقة');
});

test('students with their code; a missing code leaves the name alone', () => {
  expect(studentsLine([{ name: 'ياسمين', code: 'AB-0101' }, { name: 'يوسف', code: '' }])).toBe(`ياسمين ${ltr('AB-0101')} · يوسف`);
  expect(studentsLine([])).toBe('');
});

test('the totals in one line', () => {
  const line = totalsLine({ held: 12, student_absent: 1, cancelled_by_teacher: 2, cancelled_by_admin: 0, other: 3 });
  expect(line).toBe(t.sales.teachers.overview.totals.replace('{held}', '12').replace('{student_absent}', '1')
    .replace('{cancelled_by_teacher}', '2').replace('{cancelled_by_admin}', '0').replace('{other}', '3'));
});
