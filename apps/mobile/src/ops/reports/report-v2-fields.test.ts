import { emptyContent } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { report } from '../shared/fixtures';
import { reportFields } from './report-fields';
import { adminReportFields } from './report-v2-fields';

test('v1 reports keep the original fields; v2 reports get the new lines', () => {
  const v1 = report();
  expect(adminReportFields(v1)).toEqual(reportFields(v1));
  const v2 = adminReportFields(report({ form_version: 2, content: emptyContent(), program: 'arabic' }));
  expect(v2.map((f) => f.key)).toEqual([
    'attendance', 'program', 'topic', 'skill.reading', 'skill.writing', 'skill.listening', 'skill.grammar',
    'overall', 'homework', 'nextPlan', 'note',
  ]);
  expect(v2[1]?.value).toBe(t.enums.program.arabic);
});
