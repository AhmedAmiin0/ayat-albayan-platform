import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { CourseChangeQueries } from './course-change.queries';

// PR #464 review B2: the course's rules come from course_rules_of (migration 991), not from
// schedule_rules.subscription_id alone (null for imported, handed-over and admin-booked rules).
function fake(rows: unknown, refs: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'in', 'eq', 'order']) q[k] = vi.fn(() => q);
  Object.assign(q, { then: (ok: (v: unknown) => unknown) => Promise.resolve(rows).then(ok) });
  const rpc = vi.fn(async () => refs);
  const db = { from: vi.fn(() => q), rpc } as unknown as Db;
  return { q, rpc, queries: new CourseChangeQueries(db) };
}
const REF = { rule_id: 'ra', linked: false, clean: true, from_on: '2026-10-01', until_on: null };

describe('CourseChangeQueries', () => {
  it("rules: course_rules_of's ids, each with how it is attributed", async () => {
    const t = fake({ data: [{ id: 'ra', status: 'active' }], error: null }, { data: [REF], error: null });
    expect(await t.queries.rules('s1')).toEqual([{ id: 'ra', status: 'active', course: REF }]);
    expect(t.rpc).toHaveBeenCalledWith('course_rules_of', { p_subscription: 's1' });
    expect(t.q.in).toHaveBeenCalledWith('id', ['ra']);
  });

  it('rules: none attributed → [] and no rule read', async () => {
    const t = fake({ data: [], error: null }, { data: [], error: null });
    expect(await t.queries.rules('s1')).toEqual([]);
    expect(t.q.select).not.toHaveBeenCalled();
  });

  it("others: never the course's own rules, linked or not", async () => {
    const rule = (id: string, sub: string | null) => ({ rule: { id, subscription_id: sub } });
    const data = [rule('ra', null), rule('rx', null), rule('ry', 'other'), rule('rz', 's1')];
    const t = fake({ data, error: null }, { data: [], error: null });
    const others = await t.queries.others({ id: 's1', student_id: 'st1' }, ['ra']);
    expect(others.map((r) => r.id)).toEqual(['rx', 'ry']);
  });
});
