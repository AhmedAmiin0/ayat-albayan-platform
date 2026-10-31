import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { jana, lesson, muscat, pending, yusuf } from '@/today/testing/fixtures';
import { clockLines, inCity, lengthLine, reportHref, reportState, seriesLine, studentHref, whenLine } from './details-text';

// 13:00Z = 16:00 Riyadh, 16:00 Cairo (summer time), 17:00 Muscat. Thursday 1 Oct 2026.
const AFTER = new Date('2026-10-01T14:00:00Z');
const BEFORE = new Date('2026-10-01T12:00:00Z');

const R = 'Asia/Riyadh';

test('whenLine: the viewer’s day and time, named as theirs', () => {
  expect(whenLine(pending, '24', R)).toContain('16:00');
  expect(whenLine(pending, '24', R)).toContain(t.schedule.viewerTime);
  expect(whenLine(pending, '24', 'Asia/Muscat')).toContain('17:00');
});

test('clockLines: each student zone and the teacher’s, only when their clock differs', () => {
  // 5 Nov (winter): Cairo reads an hour behind Riyadh; on 1 Oct (summer) the same clock.
  const winter = lesson({ id: 'w', starts_at: '2026-11-05T15:00:00.000Z' });
  const cairo = inCity(winter.starts_at, 'Africa/Cairo', '24');
  expect(clockLines(winter, '24', R)).toEqual([t.schedule.teacherTime.replace('{time}', cairo)]);
  expect(clockLines(pending, '24', R)).toEqual([]);
  const group = lesson({ id: 'g', students: [yusuf, jana, { ...jana, id: 's9' }] });
  expect(clockLines(group, '24', R)).toEqual([
    t.schedule.studentTime.replace('{time}', inCity(group.starts_at, 'Asia/Muscat', '24')),
  ]);
  const riyadhTeacher = { ...winter, teacher: { display_name_ar: 'ب', tz: R } };
  expect(clockLines(riyadhTeacher, '24', R)).toEqual([]);
  // Sales’ old cache: no zones at all reads as Riyadh.
  const bare = { starts_at: winter.starts_at, teacher: { display_name_ar: 'ب' } };
  const students = [{ id: 's', code: 'AB-1', name: 'ن' }];
  expect(clockLines({ ...bare, students }, '24', R)).toEqual([]);
});

test('inCity keeps an unknown zone’s id, isolated', () => {
  expect(inCity(pending.starts_at, 'Pacific/Tahiti', '24')).toContain(ltr('Pacific/Tahiti'));
});

test('lengthLine: the duration word, null off the enum', () => {
  expect(lengthLine(pending)).toBe(t.enums.duration['45']);
  expect(lengthLine(muscat)).toBe(t.enums.duration['60']);
  expect(lengthLine({ starts_at: pending.starts_at, ends_at: '2026-10-01T13:07:00.000Z' })).toBeNull();
});

test('seriesLine: the rule’s days in order and the time in the family zone; null for a one-off', () => {
  const line = seriesLine({ ...muscat, rule_byday: [4, 0] }, '24');
  expect(line).toBe(
    t.lessons.sheet.series
      .replace('{days}', [t.enums.weekday['0'], t.enums.weekday['4']].join(t.common.listSeparator))
      .replace('{time}', inCity(muscat.starts_at, 'Asia/Muscat', '24')),
  );
  expect(seriesLine({ ...pending, rule_byday: [] }, '24')).toBeNull();
  expect(seriesLine({ ...pending, rule_id: null, rule_byday: [1] }, '24')).toBeNull();
});

test('reportState: nothing before the start or on a cancelled lesson; then sent / draft / none', () => {
  expect(reportState(pending, yusuf, BEFORE)).toBeNull();
  expect(reportState({ ...pending, status: 'cancelled_by_admin' }, yusuf, AFTER)).toBeNull();
  expect(reportState(pending, yusuf, AFTER)).toBe('none');
  expect(reportState(pending, { ...yusuf, report: { id: 'r1', status: 'draft' } }, AFTER)).toBe('draft');
  expect(reportState(pending, { ...yusuf, report: { id: 'r1', status: 'submitted' } }, AFTER)).toBe('submitted');
});

test('where a tap goes per role: admin file and sent report, teacher reports, sales «تفاصيل الطالب» of any student', () => {
  const sent = { ...yusuf, report: { id: 'r1', status: 'submitted' as const } };
  expect(studentHref('admin', { id: 's1' })).toBe('/students/s1');
  expect(studentHref('teacher', { id: 's1' })).toBe('/teacher/reports/student/s1');
  // Sales opens «تفاصيل الطالب» of any student (owner 2026-10-28); the admin tree's sales pages the admin's file.
  expect(studentHref('sales', { id: 's1' })).toBe('/sales/students/s1');
  expect(studentHref('sales', { id: 's1' }, '')).toBe('/students/s1');
  expect(reportHref('admin', pending, sent)).toBe('/students/reports/view/r1');
  expect(reportHref('admin', pending, yusuf)).toBeNull();
  expect(reportHref('teacher', pending, yusuf)).toBe('/teacher/reports/l-pending');
  expect(reportHref('sales', pending, sent)).toBeNull();
});
