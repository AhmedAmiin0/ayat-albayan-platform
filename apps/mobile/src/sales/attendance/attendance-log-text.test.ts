import { lessonStatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ATTENDANCE_STYLE } from '../student/attendance-text';
import { attendancePath } from './attendance-log-api';
import { cancelLine, dayDateOf, monthOf, rowChip, rowTags, totalsItems } from './attendance-log-text';
import { logRow, logTable } from './fixtures';

const w = t.sales.student.log;

test('the totals in the owner\'s order; both cancellations count as «ألغيت»', () => {
  const totals = { ...logTable().totals, cancelled_by_admin: 2, rescheduled: 1 };
  expect(totalsItems(totals).map((i) => [i.label, i.n])).toEqual([
    [w.totals.held, 2], [w.totals.absent, 0], [w.totals.excused, 0], [w.totals.late, 1], [w.totals.cancelled, 3], [w.totals.rescheduled, 1],
  ]);
});

test('the chip: the student\'s day as «الحضور» says it; a cancelled or moved lesson by its status', () => {
  expect(rowChip(logRow())).toEqual({ ...ATTENDANCE_STYLE.present, label: t.sales.student.kind.present });
  expect(rowChip(logRow({ kind: 'absent' }))).toEqual({ ...ATTENDANCE_STYLE.absent, label: t.sales.student.kind.absent });
  expect(rowChip(logRow({ kind: 'cancelled', status: 'cancelled_by_admin' }))).toEqual({
    ...lessonStatusStyle.cancelled_by_admin, label: t.enums.lessonStatus.cancelled_by_admin,
  });
  expect(rowChip(logRow({ kind: null, status: 'rescheduled' })).label).toBe(t.enums.lessonStatus.rescheduled);
});

test('tags: trial, makeup, moved-in and late, only those that apply', () => {
  expect(rowTags(logRow())).toEqual([]);
  expect(rowTags(logRow({ is_trial: true, is_makeup: true, is_rescheduled: true, attendance: 'late' }))).toEqual([w.trial, w.makeup, w.moved, w.late]);
  expect(rowTags(logRow({ kind: 'absent', attendance: 'late' }))).toEqual([]);
});

test('the cancel reason as a line, none without one', () => {
  expect(cancelLine(logRow({ cancel_reason: 'عطلة' }))).toBe(w.cancelReason.replace('{reason}', 'عطلة'));
  expect(cancelLine(logRow())).toBeNull();
});

test('the Riyadh day: 21:30 UTC on the 31st is already the 1st in Riyadh; months name the year', () => {
  expect(dayDateOf('2026-10-31T21:30:00Z', 'Asia/Riyadh').replace(/\u200f/g, '')).toContain('1/11');
  expect(monthOf('2026-10')).toContain('2026');
});

test('the API: sales\' route in the sales tree, the admin\'s student route elsewhere', () => {
  expect(attendancePath('/sales', 's1')).toBe('/sales/students/s1/attendance');
  expect(attendancePath('', 's1')).toBe('/students/s1/attendance');
});
