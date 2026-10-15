import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { trialFactsOf, trialStudentsOf, type TrialLessonRow } from './student-trial.plan';

type RowOpts = { student_id?: string; attendance?: Attendance; status?: LessonStatus; pkg?: PackageSize | null };
const row = (o: RowOpts): TrialLessonRow => ({
  student_id: o.student_id ?? 's1',
  attendance: o.attendance ?? null,
  lesson: { status: o.status ?? 'scheduled', rule: o.pkg === null ? null : { package: o.pkg ?? 'trial' } },
});

describe('trialFactsOf: the trial lessons trialMove reads (owner 2026-10-15)', () => {
  it('scheduled / confirmed trial lesson → open', () => {
    expect(trialFactsOf([row({ status: 'scheduled' })]).get('s1')).toEqual({ open: true, attended: false });
    expect(trialFactsOf([row({ status: 'confirmed' })]).get('s1')).toEqual({ open: true, attended: false });
  });

  it('completed / late and not absent / excused → attended (no attendance mark counts as attended)', () => {
    expect(trialFactsOf([row({ status: 'completed', attendance: 'on_time' })]).get('s1')?.attended).toBe(true);
    expect(trialFactsOf([row({ status: 'late', attendance: 'late' })]).get('s1')?.attended).toBe(true);
    expect(trialFactsOf([row({ status: 'completed' })]).get('s1')?.attended).toBe(true);
    expect(trialFactsOf([row({ status: 'completed', attendance: 'absent' })]).get('s1')?.attended).toBe(false);
    expect(trialFactsOf([row({ status: 'completed', attendance: 'excused' })]).get('s1')?.attended).toBe(false);
  });

  it('no_show, excused, cancelled or rescheduled trial lessons: neither open nor attended', () => {
    for (const status of ['no_show', 'excused', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'] as const) {
      expect(trialFactsOf([row({ status })]).get('s1')).toEqual({ open: false, attended: false });
    }
  });

  it('package, makeup (null package) and instant (no rule) lessons are ignored; per student', () => {
    const facts = trialFactsOf([
      row({ pkg: '8', status: 'completed' }),
      row({ pkg: null, status: 'scheduled' }),
      { student_id: 's1', attendance: null, lesson: null },
      row({ student_id: 's2', status: 'scheduled' }),
    ]);
    expect(facts.get('s1')).toBeUndefined();
    expect(facts.get('s2')).toEqual({ open: true, attended: false });
  });
});

describe('trialStudentsOf: the students of the changed lessons whose rule is a trial', () => {
  it('trial rules only, each student once', () => {
    const rows = [
      { rule: { package: 'trial' as const }, lesson_students: [{ student_id: 's1' }, { student_id: 's2' }] },
      { rule: { package: 'trial' as const }, lesson_students: [{ student_id: 's1' }] },
      { rule: { package: '8' as const }, lesson_students: [{ student_id: 's3' }] },
      { rule: null, lesson_students: [{ student_id: 's4' }] },
    ];
    expect(trialStudentsOf(rows)).toEqual(['s1', 's2']);
  });
});
