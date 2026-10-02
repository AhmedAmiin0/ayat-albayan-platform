import { describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import type { BalanceQueries } from '../subscriptions/balance.queries';
import type { PackagesService } from '../subscriptions/packages.service';
import { threadRow } from './inbox.fakes';
import { familyTagsOf, threadPeople } from './thread-people';

function deps(results: Parameters<typeof fakeDb>[0]) {
  const { db, calls, argsOf } = fakeDb(results);
  const empty = (id: string) => ({ student_id: id, remaining: 0, current: null, packages: [] });
  const packages = { studentBalance: vi.fn(async (id: string) => empty(id)) } as unknown as PackagesService;
  const balances = { forStudents: vi.fn(async () => []) } as unknown as BalanceQueries;
  return { deps: { db, packages, balances }, calls, argsOf, packages, balances };
}

describe('threadPeople (R-SUB-01)', () => {
  it('a lead-only thread: the lead, no guardian, no reads', async () => {
    const t = deps({});
    const people = await threadPeople(t.deps, threadRow());
    expect(people).toEqual({ guardian: null, lead: { id: threadRow().lead_id, status: 'new' }, students: [] });
    expect(t.calls).toEqual([]);
  });

  it('a guardian: every child, oldest first, each with its S6 balance', async () => {
    const kids = [{ id: 's1', code: 'AB-0001', name: 'ياسمين', status: 'active', teacher: null }, { id: 's2', code: null, name: 'جود', status: 'trial', teacher: null }];
    const t = deps({ students: [{ data: kids }] });
    const people = await threadPeople(t.deps, threadRow({ guardian_id: 'g1', guardian_name: 'أم ياسمين', lead_id: null }));
    expect(people.guardian).toEqual({ id: 'g1', name: 'أم ياسمين' });
    expect(people.students.map((s) => [s.id, s.code, s.subscription])).toEqual([['s1', 'AB-0001', null], ['s2', '', null]]);
    expect([t.argsOf('students', 'eq'), t.argsOf('students', 'order')]).toEqual([['guardian_id', 'g1'], ['created_at']]);
    expect(t.packages.studentBalance).toHaveBeenCalledTimes(2);
  });

  it('no thread row → nobody', async () => {
    expect(await threadPeople(deps({}).deps, null)).toEqual({ guardian: null, lead: null, students: [] });
  });
});

describe('familyTagsOf (H1)', () => {
  it('no guardians on the page → no read (an empty in() is a PostgREST error)', async () => {
    const t = deps({});
    expect(await familyTagsOf(t.deps, [])).toEqual(new Map());
    expect(t.calls).toEqual([]);
  });

  it('one read for the page’s distinct guardians, then their balances', async () => {
    const t = deps({ students: [{ data: [{ id: 's1', guardian_id: 'g1', subscriptions: [] }] }] });
    await familyTagsOf(t.deps, ['g1', 'g1', 'g2']);
    expect(t.argsOf('students', 'in')).toEqual(['guardian_id', ['g1', 'g2']]);
    expect(t.balances.forStudents).toHaveBeenCalledWith(['s1']);
  });
});
