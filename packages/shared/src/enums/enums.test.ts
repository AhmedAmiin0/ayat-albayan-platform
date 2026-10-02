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
});
