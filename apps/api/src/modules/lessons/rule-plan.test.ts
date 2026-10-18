import { describe, expect, it } from 'vitest';
import { ruleRow, STUDENT_ID, TEACHER_ID } from '../scheduling/scheduling.fakes';
import { planLessons, planNewRule } from './rule-plan';

const NOW = new Date('2026-10-02T10:00:00Z');
// Mon + Wed 18:30 Riyadh (15:30Z), 60 min, from Mon 2026-10-12.
const NEXT = {
  teacherId: TEACHER_ID,
  byday: [1, 3],
  startTimeLocal: '18:30',
  tz: 'Asia/Riyadh',
  durationMin: 60 as const,
  startsOn: '2026-10-12',
};

describe('planNewRule — whole-rule reschedule (R-SCH-07)', () => {
  it('copies students, package and the rule link; occurrences over the horizon from startsOn', () => {
    const old = ruleRow({ meeting_link: 'https://meet.google.com/abc-defg-hij' });
    const { rule, occurrences } = planNewRule({ old, next: NEXT, now: NOW, weeks: 2 });
    expect(rule).toMatchObject({
      teacher_id: TEACHER_ID,
      duration_min: 60,
      start_time_local: '18:30',
      byday: [1, 3],
      starts_on: '2026-10-12',
      ends_on: null,
      package: '8',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      student_ids: [STUDENT_ID],
    });
    expect(occurrences.map((o) => o.starts_at.toISOString())).toEqual([
      '2026-10-12T15:30:00.000Z',
      '2026-10-14T15:30:00.000Z',
    ]);
  });

  it("a new teacher drops the old rule's link so their own applies", () => {
    const old = ruleRow({ meeting_link: 'https://meet.jit.si/old' });
    const { rule } = planNewRule({ old, next: { ...NEXT, teacherId: 'other' }, now: NOW, weeks: 2 });
    expect(rule.meeting_link).toBeNull();
  });

  it('a trial keeps exactly one lesson and ends on its local day (invariant 4)', () => {
    const { rule, occurrences } = planNewRule({ old: ruleRow({ package: 'trial' }), next: NEXT, now: NOW, weeks: 5 });
    expect(occurrences).toHaveLength(1);
    expect(rule.ends_on).toBe('2026-10-12');
  });

  it('a capped rule (the assistant course) keeps its ends_on and stops its lessons there', () => {
    const old = ruleRow({ ends_on: '2026-10-14', subscription_id: 'sub-1' });
    const { rule, occurrences } = planNewRule({ old, next: NEXT, now: NOW, weeks: 4 });
    expect(rule.ends_on).toBe('2026-10-14');
    expect(occurrences.map((o) => o.starts_at.toISOString())).toEqual(['2026-10-12T15:30:00.000Z', '2026-10-14T15:30:00.000Z']);
  });

  it('the replacement keeps the course tie, so rescheduling it again still keeps ends_on', () => {
    const old = ruleRow({ ends_on: '2026-10-14', subscription_id: 'sub-1', first_rule_id: 'rule-0' });
    const { rule } = planNewRule({ old, next: NEXT, now: NOW, weeks: 4 });
    expect(rule).toMatchObject({ subscription_id: 'sub-1', first_rule_id: 'rule-0' });
    const again = ruleRow({ id: rule.id, ends_on: rule.ends_on, subscription_id: rule.subscription_id });
    const second = planNewRule({ old: again, next: { ...NEXT, startTimeLocal: '19:00' }, now: NOW, weeks: 4 });
    expect(second.rule).toMatchObject({ ends_on: '2026-10-14', subscription_id: 'sub-1' });
  });

  it('an admin rule with an end day (not a course) gets an open-ended replacement, as before', () => {
    const { rule, occurrences } = planNewRule({ old: ruleRow({ ends_on: '2026-10-14' }), next: NEXT, now: NOW, weeks: 4 });
    expect(rule.ends_on).toBeNull();
    expect(occurrences.length).toBeGreaterThan(2);
  });

  it('an open-ended rule stays open-ended', () => {
    const { rule, occurrences } = planNewRule({ old: ruleRow({ ends_on: null }), next: NEXT, now: NOW, weeks: 4 });
    expect(rule.ends_on).toBeNull();
    expect(occurrences.length).toBeGreaterThan(2);
  });

  it('a start beyond the horizon plans no lessons', () => {
    const { occurrences } = planNewRule({ old: ruleRow(), next: { ...NEXT, startsOn: '2027-02-01' }, now: NOW, weeks: 5 });
    expect(occurrences).toEqual([]);
  });
});

describe('planLessons', () => {
  const plan = planNewRule({ old: ruleRow(), next: NEXT, now: NOW, weeks: 2 });

  it('one row per occurrence on the new rule, link resolved, override only on clashes', () => {
    const rows = planLessons({
      plan,
      link: { teacherLink: 'https://meet.jit.si/abrar', overrides: [null] },
      clashes: new Set(['2026-10-14T15:30:00.000Z']),
      overrideReason: 'ولي الأمر طلب كده',
    });
    expect(rows.map((r) => [r.starts_at, r.override_reason])).toEqual([
      ['2026-10-12T15:30:00.000Z', null],
      ['2026-10-14T15:30:00.000Z', 'ولي الأمر طلب كده'],
    ]);
    expect(rows[0]).toMatchObject({
      rule_id: plan.rule.id,
      teacher_id: TEACHER_ID,
      ends_at: '2026-10-12T16:30:00.000Z',
      meeting_link: 'https://meet.jit.si/abrar',
      rescheduled_from_id: null,
      student_ids: [STUDENT_ID],
    });
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });

  it("a single student's override beats the teacher link", () => {
    const [row] = planLessons({
      plan,
      link: { teacherLink: 'https://meet.jit.si/abrar', overrides: ['https://meet.google.com/own'] },
      clashes: new Set(),
      overrideReason: null,
    });
    expect(row?.meeting_link).toBe('https://meet.google.com/own');
  });
});
