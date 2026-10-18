import { courseChangeSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { BODY, RULE_A, RULE_B, SUB_ID } from './course-change.fakes';
import { changePayload, type PayloadInput } from './course-change.payload';
import { planChange } from './course-change.plan';

const NOW = new Date('2026-10-18T08:00:00Z');
const req = courseChangeSchema.parse(BODY);
const plan = planChange({
  req,
  facts: { role: 'sales', perWeek: 2, lessonsTotal: 8, durationMin: 45, tz: 'Asia/Riyadh', before: [] },
  now: NOW,
  horizonWeeks: 5,
});
const INPUT: PayloadInput = {
  req,
  actor: { id: 'u1', role: 'sales' },
  subscriptionId: SUB_ID,
  active: [RULE_A, RULE_B],
  moved: [
    { id: 'l1', status: 'scheduled', rule_id: 'ra' },
    { id: 'l2', status: 'confirmed', rule_id: 'rb' },
  ],
  plan,
  conflicts: [],
  link: { teacherLink: 'https://meet.google.com/abc-defg-hij', auto: false },
  contacts: [{ id: 's1', name: 'سهيلة', guardian: { id: 'g1', phone_e164: '+966500000001', tz: 'Asia/Riyadh' } }],
  counted: 0,
};
type Rule = { id: string; subscription_id: string; first_rule_id: string | null; ends_on: string; lessons: { id: string; starts_at: string; meeting_link: string | null }[] };
type Payload = {
  client_request_id: string;
  subscription_id: string;
  end_rules: { id: string; ends_on: string; changes: { id: string; to_status: string; chargeable: boolean }[] }[];
  new_rules: Rule[];
  messages: { lesson_id: string; guardian_id: string }[];
  audit: { entity: string; entity_id: string; action: string; after: { by: string; remaining: number; ends_on: string } };
};
const payload = changePayload(INPUT) as Payload;

describe('changePayload — change_course (migration 480)', () => {
  it('every active rule ends the day before the change point; its own open lessons move, not chargeable', () => {
    expect(payload.end_rules).toEqual([
      { id: 'ra', ends_on: '2026-10-24', changes: [{ id: 'l1', from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }] },
      { id: 'rb', ends_on: '2026-10-24', changes: [{ id: 'l2', from_status: 'confirmed', to_status: 'rescheduled', chargeable: false }] },
    ]);
  });
  it('one new rule per time, all tied to the course; the first leads (first_rule_id), all end on the REMAINING-th lesson', () => {
    const [first, second] = payload.new_rules;
    expect(payload.new_rules.map((r) => [r.subscription_id, r.ends_on])).toEqual([
      [SUB_ID, '2026-11-17'],
      [SUB_ID, '2026-11-17'],
    ]);
    expect(first?.first_rule_id).toBeNull();
    expect(second?.first_rule_id).toBe(first?.id);
    expect(payload.new_rules.flatMap((r) => r.lessons)).toHaveLength(8);
    expect(payload.client_request_id).toBe(BODY.clientRequestId);
  });
  it('the first new lesson’s confirmation and the audit row naming the actor and the course', () => {
    const firstLesson = payload.new_rules[0]?.lessons[0];
    expect(payload.messages).toEqual([expect.objectContaining({ lesson_id: firstLesson?.id, guardian_id: 'g1' })]);
    expect(firstLesson?.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
    expect(payload.audit).toEqual(
      expect.objectContaining({ entity: 'subscriptions', entity_id: SUB_ID, action: 'course_change' }),
    );
    expect(payload.audit.after).toEqual(expect.objectContaining({ by: 'sales', remaining: 8, ends_on: '2026-11-17' }));
  });
});
