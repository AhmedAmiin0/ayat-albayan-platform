import { describe, expect, it } from 'vitest';
import * as E from './enums/index.js';
import * as S from './status-style.js';

// docs/07 §6: every value of the 9 state enums has a tone and a glyph (grade: pips).
const STATE_ENUMS: [string, readonly string[], Record<string, S.StatusStyle>][] = [
  ['lesson_status', E.LESSON_STATUSES, S.lessonStatusStyle],
  ['lead_status', E.LEAD_STATUSES, S.leadStatusStyle],
  ['student_status', E.STUDENT_STATUSES, S.studentStatusStyle],
  ['subscription_status', E.SUBSCRIPTION_STATUSES, S.subscriptionStatusStyle],
  ['attendance', E.ATTENDANCES, S.attendanceStyle],
  ['teacher_status', E.TEACHER_STATUSES, S.teacherStatusStyle],
  ['job_applicant_status', E.JOB_APPLICANT_STATUSES, S.jobApplicantStatusStyle],
  ['schedule_rule_status', E.SCHEDULE_RULE_STATUSES, S.scheduleRuleStatusStyle],
];

describe('status-style (docs/07 §6)', () => {
  it.each(STATE_ENUMS)('%s: every value mapped, nothing extra', (_name, values, map) => {
    expect(Object.keys(map).sort()).toEqual([...values].sort());
    for (const v of values) {
      expect(['ok', 'act', 'bad', 'neutral']).toContain(map[v]?.tone);
      expect(['fill', 'half', 'hollow', 'struck']).toContain(map[v]?.glyph);
    }
  });

  it('grade: every value mapped to 1..5 pips, ordinal', () => {
    expect(Object.keys(S.gradeStyle).sort()).toEqual([...E.GRADES].sort());
    expect(E.GRADES.map((g) => S.gradeStyle[g].pips)).toEqual([5, 4, 3, 2, 1]);
  });

  it('covers 45 values across the 9 state enums', () => {
    const n = STATE_ENUMS.reduce((sum, [, values]) => sum + values.length, 0) + E.GRADES.length;
    expect(n).toBe(45);
  });

  it('saffron (act) only where an admin must act now', () => {
    const act = STATE_ENUMS.flatMap(([name, values, map]) =>
      values.filter((v) => map[v]?.tone === 'act').map((v) => `${name}.${v}`),
    );
    expect(act.sort()).toEqual([
      'lead_status.new',
      'lesson_status.scheduled',
      'subscription_status.expired',
      'subscription_status.unpaid',
    ]);
  });
});
