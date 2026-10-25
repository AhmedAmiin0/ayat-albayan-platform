import { AFTER_FIELDS, DONE_FIELDS, REPORT_RUBRICS } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The form logic (valuesOf, submitProblem, shouldSave…) is tested in @ab/shared reports/form-values.

test('the form’s questions in the Google Form’s order, labels verbatim (as the web form)', () => {
  const labels = [
    ...DONE_FIELDS.map((k) => t.reports[k]),
    ...REPORT_RUBRICS.map((r) => t.reports.rubric[r]),
    t.reports.overall,
    ...AFTER_FIELDS.map((k) => t.reports[k]),
  ];
  expect(labels).toEqual([
    'التسميع (المُسمَّع)',
    'الحفظ الجديد',
    'المراجعة',
    'الدرس النظري / أحكام التجويد',
    'التلاوة والنطق',
    'الحفظ الجديد',
    'المراجعة',
    'التجويد',
    'الاستيعاب والتفاعل',
    'الالتزام والحضور',
    'التقدير العام للحلقة',
    'ملاحظات المعلمة',
    'الواجب المطلوب قبل الحلقة القادمة',
    'خطة الحلقة القادمة',
  ]);
});
