import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { jana, lesson, muscat, pending, yusuf } from '@/today/testing/fixtures';
import { clockLines, inCity, lengthLine, reportHref, reportState, seriesLine, studentHref, whenLine } from './details-text';

// 13:00Z = 16:00 Riyadh, 16:00 Cairo (summer time), 17:00 Muscat. Thursday 1 Oct 2026.
const AFTER = new Date('2026-10-01T14:00:00Z');
const BEFORE = new Date('2026-10-01T12:00:00Z');

test('whenLine: the Riyadh day and time, named as Riyadh', () => {
  expect(whenLine(pending, '24')).toContain('16:00');
  expect(whenLine(pending, '24')).toContain(t.schedule.riyadhTime);
});

test('clockLines: each student zone and the teacher’s, only when not Riyadh, in the web wording', () => {
  const cairo = inCity(pending.starts_at, 'Africa/Cairo', '24');
  expect(clockLines(pending, '24')).toEqual([t.schedule.teacherTime.replace('{time}', cairo)]);
  const group = lesson({ id: 'g', students: [yusuf, jana, { ...jana, id: 's9' }] });
  expect(clockLines(group, '24')).toEqual([
    t.schedule.studentTime.replace('{time}', inCity(group.starts_at, 'Asia/Muscat', '24')),
    t.schedule.teacherTime.replace('{time}', cairo),
  ]);
  expect(clockLines({ ...pending, teacher: { display_name_ar: 'ب', tz: 'Asia/Riyadh' } }, '24')).toEqual([]);
  // Sales’ old cache: no zones at all reads as Riyadh.
  expect(clockLines({ starts_at: pending.starts_at, teacher: { display_name_ar: 'ب' }, students: [{ id: 's', code: 'AB-1', name: 'ن' }] }, '24')).toEqual([]);
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

test('where a tap goes per role: admin file and sent report, teacher reports, nothing for sales', () => {
  const sent = { ...yusuf, report: { id: 'r1', status: 'submitted' as const } };
  expect(studentHref('admin', 's1')).toBe('/students/s1');
  expect(studentHref('teacher', 's1')).toBe('/teacher/reports/student/s1');
  expect(studentHref('sales', 's1')).toBeNull();
  expect(reportHref('admin', pending, sent)).toBe('/students/reports/view/r1');
  expect(reportHref('admin', pending, yusuf)).toBeNull();
  expect(reportHref('teacher', pending, yusuf)).toBe('/teacher/reports/l-pending');
  expect(reportHref('sales', pending, sent)).toBeNull();
});
