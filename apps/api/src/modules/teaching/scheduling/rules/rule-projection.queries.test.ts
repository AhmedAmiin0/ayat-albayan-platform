import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { RuleProjectionQueries } from './rule-projection.queries';

const RULE = {
  id: 'r1',
  teacher_id: 't1',
  byday: [0, 1, 2, 3, 4, 5, 6],
  start_time_local: '17:00',
  duration_min: 45,
  tz: 'Asia/Riyadh',
  starts_on: '2026-10-01',
  ends_on: null,
  schedule_rule_students: [{ student_id: 's1' }],
};
const SPAN = { from: new Date('2026-10-04T14:00:00Z'), to: new Date('2026-10-04T14:45:00Z') };

describe('RuleProjectionQueries — generated dates are keyed on local_date (R-SCH-11, migration 174)', () => {
  it('looks up the held dates by local_date (±2 days), not by starts_at', async () => {
    const { db, calls } = fakeDb({ schedule_rules: [{ data: [RULE] }], lessons: [{ data: [] }] });
    await new RuleProjectionQueries(db).busy({ teacherId: 't1', studentIds: [], span: SPAN, excludeRuleIds: [] }, new Date('2026-10-02T10:00:00Z'));
    expect(calls).toContainEqual({ table: 'lessons', method: 'gte', args: ['local_date', '2026-10-02'] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'lte', args: ['local_date', '2026-10-06'] });
    expect(calls.filter((c) => c.table === 'lessons' && c.args[0] === 'starts_at')).toEqual([]);
  });

  it('a lesson edited to another day still holds its original date: that slot is not projected as busy', async () => {
    // The 4th at 17:00 Riyadh was moved away in place; its row keeps local_date 2026-10-04.
    const { db } = fakeDb({
      schedule_rules: [{ data: [RULE] }],
      lessons: [{ data: [{ id: 'moved', rule_id: 'r1', local_date: '2026-10-04' }] }],
    });
    const busy = await new RuleProjectionQueries(db).busy({ teacherId: 't1', studentIds: [], span: SPAN, excludeRuleIds: [] }, new Date('2026-10-02T10:00:00Z'));
    expect(busy.teacher).toEqual([]);
  });

  it('an empty held list projects the occurrence (control)', async () => {
    const { db } = fakeDb({ schedule_rules: [{ data: [RULE] }], lessons: [{ data: [] }] });
    const busy = await new RuleProjectionQueries(db).busy({ teacherId: 't1', studentIds: [], span: SPAN, excludeRuleIds: [] }, new Date('2026-10-02T10:00:00Z'));
    expect(busy.teacher).toHaveLength(1);
  });
});
