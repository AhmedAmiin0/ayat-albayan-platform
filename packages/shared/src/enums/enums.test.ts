import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import * as E from './index.js';

const LABELLED: [keyof typeof ar.enums, readonly (string | number)[]][] = [
  ['leadStatus', E.LEAD_STATUSES],
  ['leadSource', E.LEAD_SOURCES],
  ['lessonStatus', E.LESSON_STATUSES],
  ['subscriptionStatus', E.SUBSCRIPTION_STATUSES],
  ['program', E.PROGRAMS],
  ['grade', E.GRADES],
  ['attendance', E.ATTENDANCES],
  ['packageSize', E.PACKAGE_SIZES],
  ['gender', E.GENDERS],
  ['studentStatus', E.STUDENT_STATUSES],
  ['teacherStatus', E.TEACHER_STATUSES],
  ['jobApplicantStatus', E.JOB_APPLICANT_STATUSES],
  ['scheduleRuleStatus', E.SCHEDULE_RULE_STATUSES],
  ['weekday', E.WEEKDAYS],
  ['duration', E.DURATIONS],
  ['reportStatus', E.REPORT_STATUSES],
  ['pdfStatus', E.PDF_STATUSES],
  ['paymentMethod', E.PAYMENT_METHODS],
  ['payoutStatus', E.PAYOUT_STATUSES],
  ['expenseCategory', E.EXPENSE_CATEGORIES],
  ['paymentKind', E.PAYMENT_KINDS],
  ['adminTaskKind', E.ADMIN_TASK_KINDS],
  ['messageStatus', E.MESSAGE_STATUSES],
  ['templateStatus', E.TEMPLATE_STATUSES],
  ['templateCategory', E.TEMPLATE_CATEGORIES],
  ['pushKind', E.PUSH_KINDS],
  ['waLine', E.WA_LINES],
  ['feedbackKind', E.FEEDBACK_KINDS],
  ['feedbackRecommend', E.FEEDBACK_RECOMMEND],
];

describe('enums ↔ ar.json labels (rule 10, R-NFR-01)', () => {
  it.each(LABELLED)('every %s value has an Arabic label', (ns, values) => {
    expect(Object.keys(ar.enums[ns]).sort()).toEqual(values.map(String).sort());
  });

  it('grade labels match the report form wording (docs/03 §2)', () => {
    expect(E.GRADES.map((g) => ar.enums.grade[g])).toEqual([
      'ممتاز',
      'جيد جدًا',
      'جيد',
      'مقبول',
      'يحتاج إلى مراجعة',
    ]);
  });

  it('feedback option wording and the 1-5 scale match the Google Form (docs/13-forms-spec.md)', () => {
    expect(E.FEEDBACK_KINDS.map((k) => ar.enums.feedbackKind[k])).toEqual(['حلقة تجريبية مجانية', 'ضمن الاشتراك الشهري']);
    expect(E.FEEDBACK_RECOMMEND.map((k) => ar.enums.feedbackRecommend[k])).toEqual(['نعم', 'ربما', 'لا']);
    expect(E.FEEDBACK_RATINGS).toEqual([1, 2, 3, 4, 5]);
  });
});
