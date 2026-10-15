import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { trialFactsOf, trialStudentsOf, type TrialLessonRow } from './student-trial.plan';

type RowOpts = { student_id?: string; attendance?: Attendance; status?: LessonStatus; pkg?: PackageSize | null };
const row = (o: RowOpts): TrialLessonRow => ({
  student_id: o.student_id ?? 's1',
  attendance: o.attendance ?? null,
  chargeable: true,
  lesson: {
    status: o.status ?? 'scheduled',
    ...{ rule_id: 'r1', instant: false, makeup_of_id: null },
    rule: o.pkg === null ? null : { package: o.pkg ?? 'trial' },
  },
});
type Imported = { status?: LessonStatus; chargeable?: boolean; instant?: boolean; makeup?: string; rule?: string };
const imported = (o: Imported): TrialLessonRow => ({
  student_id: 's1',
  attendance: 'on_time',
  chargeable: o.chargeable ?? false,
  lesson: { status: o.status ?? 'completed', rule_id: o.rule ?? null, instant: o.instant ?? false, makeup_of_id: o.makeup ?? null, rule: null },
});

describe('trialFactsOf: the trial lessons trialMove reads (owner 2026-10-15)', () => {
  it('scheduled / confirmed trial lesson → open', () => {
    expect(trialFactsOf([row({ status: 'scheduled' })]).get('s1')).toEqual({ open: true, attended: false, paid: false });
    expect(trialFactsOf([row({ status: 'confirmed' })]).get('s1')).toEqual({ open: true, attended: false, paid: false });
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
      expect(trialFactsOf([row({ status })]).get('s1')).toEqual({ open: false, attended: false, paid: false });
    }
  });

  it('package, makeup (null package) and instant (no rule) lessons are ignored; per student', () => {
    const facts = trialFactsOf([
      row({ pkg: '8', status: 'completed' }),
      row({ pkg: null, status: 'scheduled' }),
      { student_id: 's1', attendance: null, chargeable: true, lesson: null },
      row({ student_id: 's2', status: 'scheduled' }),
    ]);
    expect(facts.get('s1')).toBeUndefined();
    expect(facts.get('s2')).toEqual({ open: true, attended: false, paid: false });
  });
});

describe('trialFactsOf: imported trial lessons (tools/migrate: no rule, not chargeable; best effort)', () => {
  it('no rule, not instant, not a makeup, not chargeable → a trial lesson', () => {
    expect(trialFactsOf([imported({})]).get('s1')).toEqual({ open: false, attended: true, paid: false });
    expect(trialFactsOf([imported({ status: 'no_show' })]).get('s1')).toEqual({ open: false, attended: false, paid: false });
  });

  it('chargeable, instant, makeup or with a (non-trial) rule → not a trial lesson', () => {
    const rows = [imported({ chargeable: true }), imported({ instant: true }), imported({ makeup: 'L0' }), imported({ rule: 'r1' })];
    for (const r of rows) expect(trialFactsOf([r]).get('s1')).toBeUndefined();
  });
});

describe('trialStudentsOf: the students of the changed lessons whose rule is a trial', () => {
  const ruled = { rule_id: 'r1', instant: false, makeup_of_id: null };
  const on = (student_id: string, chargeable = true) => ({ student_id, chargeable });
  it('trial rules or the imported marker (that student not chargeable), each student once', () => {
    const rows = [
      { ...ruled, rule: { package: 'trial' as const }, lesson_students: [on('s1'), on('s2')] },
      { ...ruled, rule: { package: 'trial' as const }, lesson_students: [on('s1')] },
      { ...ruled, rule: { package: '8' as const }, lesson_students: [on('s3', false)] },
      { ...ruled, rule: null, lesson_students: [on('s4', false)] },
      { ...ruled, rule_id: null, rule: null, lesson_students: [on('s5', false), on('s6')] },
      { ...ruled, rule_id: null, instant: true, rule: null, lesson_students: [on('s7', false)] },
    ];
    expect(trialStudentsOf(rows)).toEqual(['s1', 's2', 's5']);
  });
});
