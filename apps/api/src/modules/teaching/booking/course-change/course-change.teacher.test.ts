import { courseTeacherChangeSchema, type DayTime } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { BODY, RULE_A, SUB_ID } from './course-change.fakes';
import { changePayload, type PayloadInput } from './course-change.payload';
import { assertStart, planChange } from './course-change.plan';

// «تغيير المعلم» from the student's profile (owner 2026-10-30): the same change, the new rules'
// teacher.
const NOW = new Date('2026-10-18T08:00:00Z');
const NEW_TEACHER = '00000000-0000-4000-8000-0000000000e2';
const req = courseTeacherChangeSchema.parse({ ...BODY, teacherId: NEW_TEACHER });
const facts = {
  role: 'admin' as const,
  perWeek: 2,
  lessonsTotal: 8,
  durationMin: 45 as const,
  tz: 'Asia/Riyadh',
};
const plan = planChange({ req, facts: { ...facts, before: [] }, now: NOW, horizonWeeks: 5 });
const linked = { ...RULE_A, meeting_link: 'https://meet.google.com/old-teacher' };
const input = (over: Partial<PayloadInput> = {}): PayloadInput => ({
  req,
  actor: { id: 'u1', role: 'admin' },
  subscriptionId: SUB_ID,
  active: [linked],
  moved: [{ id: 'l1', status: 'scheduled', rule_id: 'ra' }],
  plan,
  conflicts: [],
  link: { teacherLink: 'https://meet.google.com/new-teacher', auto: false },
  contacts: [],
  counted: 2,
  ...over,
});
interface Payload {
  new_rules: {
    teacher_id: string;
    meeting_link: string | null;
    lessons: { teacher_id?: string }[];
  }[];
  end_rules: { id: string; changes: { id: string; to_status: string }[] }[];
  audit: { after: { teacher: { from: string; to: string }; remaining: number } };
}

describe('assertStart with a new teacher', () => {
  const rules = [
    {
      status: 'active',
      starts_on: '2026-10-01',
      ends_on: null,
      byday: [0, 2],
      start_time_local: '17:00:00',
    },
  ];
  const same = { ...BODY, dayTimes: [] as DayTime[] };

  it('the same days are no_change for a time change only', () => {
    expect(() => assertStart(same, { subStartsOn: '2026-10-01', rules })).toThrow('no_change');
  });

  it('the same days are a change when the teacher changes', () => {
    expect(() =>
      assertStart(same, { subStartsOn: '2026-10-01', rules, teacherChanged: true }),
    ).not.toThrow();
  });
});

describe('changePayload with a new teacher', () => {
  const payload = changePayload(input()) as unknown as Payload;

  it("the new rules are the new teacher's, with no copied room link (the teacher's own is used)", () => {
    expect(payload.new_rules.map((r) => [r.teacher_id, r.meeting_link])).toEqual(
      payload.new_rules.map(() => [NEW_TEACHER, null]),
    );
  });

  it("the old rule ends and its open lesson moves; the remaining count is the plan's", () => {
    expect(payload.end_rules[0]?.changes).toEqual([
      { id: 'l1', from_status: 'scheduled', to_status: 'rescheduled', chargeable: false },
    ]);
    expect(plan.remaining).toBe(8);
    expect(payload.audit.after.remaining).toBe(8);
  });

  it('the audit row names both teachers', () => {
    expect(payload.audit.after.teacher).toEqual({ from: 't1', to: NEW_TEACHER });
  });

  it("without a new teacher the course's teacher and link stay", () => {
    const plain = { ...req, teacherId: undefined };
    const kept = changePayload(input({ req: plain })) as unknown as Payload;
    expect(
      kept.new_rules.every(
        (r) => r.teacher_id === 't1' && r.meeting_link === 'https://meet.google.com/old-teacher',
      ),
    ).toBe(true);
    expect(kept.audit.after.teacher).toEqual({ from: 't1', to: 't1' });
  });
});
