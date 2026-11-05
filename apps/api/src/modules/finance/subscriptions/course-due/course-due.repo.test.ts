import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { CourseDueRepo } from './course-due.repo';

const NOW = new Date('2026-11-06T12:00:00.000Z');
const row = (id: string, rules: { id: string }[] = []) => ({
  id,
  student_id: `st-${id}`,
  created_by: 's1',
  rules,
  student: { name: 'سهيلة', guardian: { phone_e164: '+966500000000' } },
});

describe('CourseDueRepo (owner 2026-11-06)', () => {
  it('unbooked: the package with no rule of its own; null once booked or unknown', async () => {
    const t = fakeDb({ subscriptions: [{ data: row('a') }, { data: row('b', [{ id: 'r' }]) }, { data: null }] });
    const repo = new CourseDueRepo(t.db);
    expect(await repo.unbooked('a')).toEqual({ subscriptionId: 'a', studentId: 'st-a', student: 'سهيلة', phone: '+966500000000', soldBy: 's1' });
    expect(await repo.unbooked('b')).toBeNull();
    expect(await repo.unbooked('x')).toBeNull();
  });

  it('overdue: active 2 h+ (latest activation), no course, not on a running imported course', async () => {
    const t = fakeDb({
      audit_log: [{ data: [
        { entity_id: 'a', at: '2026-11-06T08:00:00.000Z' },
        { entity_id: 'b', at: '2026-11-06T08:00:00.000Z' },
        { entity_id: 'c', at: '2026-11-06T08:00:00.000Z' },
        { entity_id: 'fresh', at: '2026-11-06T11:00:00.000Z' },
      ] }],
      subscriptions: [{ data: [row('a'), row('b', [{ id: 'r' }]), row('c')] }],
      schedule_rule_students: [{ data: [
        { student_id: 'st-c', rule: { starts_on: '2026-01-01', ends_on: null, package: '8', status: 'active', subscription_id: null } },
      ] }],
    });
    const due = await new CourseDueRepo(t.db).overdue(NOW);
    expect(due.map((p) => p.subscriptionId)).toEqual(['a']);
    expect(t.argsOf('subscriptions', 'in')).toEqual(['id', ['a', 'b', 'c']]);
    expect(t.argsOf('subscriptions', 'eq')).toEqual(['status', 'active']);
    expect(t.argsOf('audit_log', 'gte')).toEqual(['at', '2026-10-30T12:00:00.000Z']);
  });

  it('overdue: nothing activated → no package read', async () => {
    const t = fakeDb({ audit_log: [{ data: [] }] });
    expect(await new CourseDueRepo(t.db).overdue(NOW)).toEqual([]);
    expect(t.argsOf('subscriptions', 'in')).toBeUndefined();
  });
});
