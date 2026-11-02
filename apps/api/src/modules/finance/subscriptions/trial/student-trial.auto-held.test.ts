import { trialMove, type Attendance, type LessonStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { trialFactsOf, type TrialLessonRow } from './student-trial.plan';

// An auto-held trial (owner 2026-11-02): the job sets completed and leaves attendance null, so the
// student moves exactly like an attended trial; a correction afterwards moves nobody back.
const trial = (status: LessonStatus, attendance: Attendance | null = null): TrialLessonRow => ({
  student_id: 's1',
  attendance,
  chargeable: false,
  lesson: { status, rule_id: 'r1', instant: false, makeup_of_id: null, rule: { package: 'trial' } },
});

describe('auto-held trial → student status', () => {
  it('completed with no attendance mark: trial → «بانتظار الاشتراك» like an attended trial', () => {
    const facts = trialFactsOf([trial('completed')]).get('s1');
    expect(facts).toEqual({ open: false, attended: true, paid: false });
    expect(facts && trialMove('trial', facts)).toEqual({
      from: 'trial',
      to: 'pending_subscription',
      reason: 'trial_attended',
    });
  });

  it('a report marking the student absent later: not attended (trial → new while the student is still trial)', () => {
    const facts = trialFactsOf([trial('no_show', 'absent')]).get('s1');
    expect(facts && trialMove('trial', facts)).toEqual({
      from: 'trial',
      to: 'new',
      reason: 'trial_missed',
    });
  });

  it('corrected to «ألغاها المعلم/ة» after the move: pending_subscription stays (trialMove only moves new / trial)', () => {
    const facts = trialFactsOf([trial('cancelled_by_teacher')]).get('s1');
    expect(facts && trialMove('pending_subscription', facts)).toBeNull();
  });
});
