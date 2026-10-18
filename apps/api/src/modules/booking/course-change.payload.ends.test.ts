import { courseChangeSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { BODY, RULE_A, RULE_B, SUB_ID } from './course-change.fakes';
import { changePayload, type PayloadInput } from './course-change.payload';
import { planChange } from './course-change.plan';

// A change never lengthens an old rule (review fix 1) and writes every moved lesson (review fix 3).

const NOW = new Date('2026-10-18T08:00:00Z');
const req = courseChangeSchema.parse(BODY); // startsOn 2026-10-25
const facts = { role: 'admin' as const, perWeek: 2, lessonsTotal: 8, durationMin: 45 as const, tz: 'Asia/Riyadh', before: [] };
const plan = planChange({ req, facts, now: NOW, horizonWeeks: 5 });
const base: PayloadInput = {
  req,
  actor: { id: 'u1', role: 'admin' },
  subscriptionId: SUB_ID,
  active: [RULE_A, RULE_B],
  moved: [],
  plan,
  conflicts: [],
  link: { teacherLink: null, auto: false },
  contacts: [],
  counted: 0,
};
type Step = { id: string; from_status: string; to_status: string; chargeable: boolean };
type Payload = { starts_on: string; end_rules: { id: string; ends_on: string; changes: Step[] }[]; changes: Step[]; audit: { after: { moved: string[] } } };
const payloadOf = (o: Partial<PayloadInput>) => changePayload({ ...base, ...o }) as Payload;

describe('changePayload — old rules end at min(their ends_on, startsOn − 1)', () => {
  it('a rule whose last lesson is before the change point gets no end_rule step: its ends_on stays', () => {
    // RULE_A last lesson Wed 21 Oct (ends 2026-10-21), change from Sun 25 Oct.
    const p = payloadOf({ active: [{ ...RULE_A, ends_on: '2026-10-21' }, RULE_B] });
    expect(p.end_rules.map((r) => [r.id, r.ends_on])).toEqual([['rb', '2026-10-24']]);
    expect(p.starts_on).toBe('2026-10-25');
  });
  it('a rule ending the day before the change point is not touched; an open-ended one ends then', () => {
    const p = payloadOf({ active: [{ ...RULE_A, ends_on: '2026-10-24' }, { ...RULE_B, ends_on: null }] });
    expect(p.end_rules.map((r) => [r.id, r.ends_on])).toEqual([['rb', '2026-10-24']]);
  });
});

describe('changePayload — every moved lesson is written', () => {
  it('a moved lesson of a rule with no end_rule step (ended, paused or ending earlier) goes in `changes`', () => {
    const moved = [
      { id: 'l1', status: 'scheduled' as const, rule_id: 'ra' },
      { id: 'l2', status: 'confirmed' as const, rule_id: 'old' },
      { id: 'l3', status: 'scheduled' as const, rule_id: null },
    ];
    const p = payloadOf({ moved });
    const step = (id: string, from: string) => ({ id, from_status: from, to_status: 'rescheduled', chargeable: false });
    expect(p.end_rules.find((r) => r.id === 'ra')?.changes).toEqual([step('l1', 'scheduled')]);
    expect(p.changes).toEqual([step('l2', 'confirmed'), step('l3', 'scheduled')]);
    const written = [...p.end_rules.flatMap((r) => r.changes), ...p.changes].map((c) => c.id).sort();
    expect(written).toEqual(p.audit.after.moved.sort());
  });
});
