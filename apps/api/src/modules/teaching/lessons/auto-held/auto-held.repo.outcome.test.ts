import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { AutoHeldRepo } from './auto-held.repo';

// The reads of the confirmation-required pass (owner 2026-11-03).
describe('AutoHeldRepo: reminded / outcomesSince', () => {
  it('reminded: the lessons whose family lesson_reminder* the platform got out', async () => {
    const rows = [
      { lesson_id: 'a', created_at: '2026-11-04T08:00:00Z' },
      { lesson_id: 'a', created_at: '2026-11-04T09:00:00Z' },
      { lesson_id: null, created_at: '2026-11-04T10:00:00Z' },
    ];
    const f = fakeDb({ messages: [{ data: rows }] });
    const latest = await new AutoHeldRepo(f.db).reminded(['a', 'b']);
    expect([...latest]).toEqual([['a', Date.parse('2026-11-04T09:00:00Z')]]);
    const args = (m: string) => f.calls.filter((c) => c.method === m).map((c) => c.args);
    expect(args('in')).toEqual([
      ['lesson_id', ['a', 'b']],
      ['status', ['sent', 'delivered', 'read']],
    ]);
    expect(args('eq')).toEqual([['direction', 'outbound']]);
    expect(args('not')).toEqual([['guardian_id', 'is', null]]);
    expect(args('like')).toEqual([['template_key', 'lesson_reminder%']]);
  });

  it('reminded: no ids, no read', async () => {
    const f = fakeDb({});
    expect((await new AutoHeldRepo(f.db).reminded([])).size).toBe(0);
    expect(f.trips).toEqual([]);
  });

  it('outcomesSince: the migration-1000 instant, parsed; a bad value or an error throws', async () => {
    const f = fakeDb({
      'rpc:lesson_outcomes_since': [
        { data: '2026-11-03T08:15:00.123456+00:00' },
        { data: 'soon' },
        { error: { code: '42883', message: 'function does not exist' } },
      ],
    });
    const repo = new AutoHeldRepo(f.db);
    expect((await repo.outcomesSince()).toISOString()).toBe('2026-11-03T08:15:00.123Z');
    await expect(repo.outcomesSince()).rejects.toThrow();
    await expect(repo.outcomesSince()).rejects.toThrow();
  });
});
