import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { AutoHeldRepo } from './auto-held.repo';

describe('AutoHeldRepo', () => {
  it('openEnded: open lessons whose end is in the window, oldest first', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    const from = new Date('2026-10-19T12:00:00Z');
    const until = new Date('2026-11-02T11:30:00Z');
    await new AutoHeldRepo(f.db).openEnded({ from, until });
    expect(f.argsOf('lessons', 'in')).toEqual(['status', ['scheduled', 'confirmed']]);
    const args = (m: string) => f.calls.filter((c) => c.method === m).map((c) => c.args);
    expect(args('gte')).toEqual([
      ['starts_at', '2026-10-18T12:00:00.000Z'],
      ['ends_at', from.toISOString()],
    ]);
    expect(args('lte')).toEqual([
      ['starts_at', until.toISOString()],
      ['ends_at', until.toISOString()],
    ]);
  });

  it('correctable: auto-held by the job and no submitted report since', async () => {
    const f = fakeDb({
      audit_log: [{ data: [{ entity_id: 'a' }, { entity_id: 'b' }] }],
      lesson_reports: [{ data: [{ lesson_id: 'b' }] }],
    });
    expect([...(await new AutoHeldRepo(f.db).correctable(['a', 'b', 'c']))]).toEqual(['a']);
    expect(f.argsOf('audit_log', 'eq')).toEqual(['entity', 'lessons']);
    expect(
      f.calls.filter((c) => c.table === 'audit_log' && c.method === 'eq').map((c) => c.args),
    ).toContainEqual(['after->>reason', 'auto_held']);
    expect(
      f.calls.filter((c) => c.table === 'lesson_reports' && c.method === 'eq').map((c) => c.args),
    ).toContainEqual(['status', 'submitted']);
  });

  it('correctable: no ids, no read', async () => {
    const f = fakeDb({});
    expect((await new AutoHeldRepo(f.db).correctable([])).size).toBe(0);
    expect(f.trips).toEqual([]);
  });

  it('packages: every package row of the students', async () => {
    const f = fakeDb({
      subscriptions: [{ data: [{ student_id: 's1', starts_on: '2026-10-01', status: 'active' }] }],
    });
    expect(await new AutoHeldRepo(f.db).packages(['s1'])).toHaveLength(1);
    expect(f.argsOf('subscriptions', 'in')).toEqual(['student_id', ['s1']]);
  });
});
