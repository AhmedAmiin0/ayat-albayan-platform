import { t } from '@/lib/i18n';
import { report } from './fixtures';
import { reportFields } from './report-fields';

test('the form’s order and words; a blank field stays a null value', () => {
  const fields = reportFields(report());
  expect(fields[0]).toEqual({
    key: 'attendance',
    label: t.reports.attendance,
    value: t.enums.attendance.on_time,
  });
  expect(fields.find((f) => f.key === 'newMemorization')?.value).toBeNull();
  expect(fields.find((f) => f.label === t.reports.rubric.recitation)?.value).toBe(
    t.enums.grade.excellent,
  );
  expect(fields.find((f) => f.label === t.reports.notes)?.value).toBe('أداء ممتاز');
  expect(fields).toHaveLength(16);
  expect(new Set(fields.map((f) => f.key)).size).toBe(16);
});

test('an old report with no program, attendance or overall grade', () => {
  const fields = reportFields(report({ program: null, attendance: null, grade_overall: null }));
  expect(fields.filter((f) => f.value === null).map((f) => f.label)).toEqual(
    expect.arrayContaining([t.reports.program, t.reports.attendance, t.reports.overall]),
  );
});
