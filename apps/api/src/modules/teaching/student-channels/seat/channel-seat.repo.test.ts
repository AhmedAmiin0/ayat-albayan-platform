import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ChannelSeatRepo } from './channel-seat.repo';

// The seat's writes are compare-and-set (race-safe): the update names the holder it read.

type Call = [string, ...unknown[]];

function rig(rows: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    calls.push(['from', table]);
    const q: Record<string, unknown> = {
      maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    };
    for (const m of ['select', 'update', 'eq', 'is']) {
      q[m] = (...a: unknown[]) => {
        calls.push([m, ...a]);
        return q;
      };
    }
    return q;
  };
  return { repo: new ChannelSeatRepo({ from } as unknown as Db), calls };
}

describe('ChannelSeatRepo', () => {
  it('take: a free seat only while it is still free; a stale one only while it still holds her', async () => {
    const free = rig();
    await free.repo.take({ studentId: 'st1', profileId: 'p-b', from: null });
    expect(free.calls).toContainEqual(['update', { assistant_id: 'p-b' }]);
    expect(free.calls).toContainEqual(['is', 'assistant_id', null]);
    const stale = rig();
    await stale.repo.take({ studentId: 'st1', profileId: 'p-b', from: 'p-old' });
    expect(stale.calls).toContainEqual(['eq', 'assistant_id', 'p-old']);
  });

  it('leave: frees the seat only where the caller holds it', async () => {
    const { repo, calls } = rig();
    await repo.leave({ studentId: 'st1', profileId: 'p-b' });
    expect(calls).toContainEqual(['update', { assistant_id: null }]);
    expect(calls).toContainEqual(['eq', 'assistant_id', 'p-b']);
  });

  it('read: the bringer and the stored holder; an unknown student is null', async () => {
    const rows = { students: { brought_by: 'p-a' }, student_channels: { assistant_id: 'p-b' } };
    const seat = await rig({ ...rows, profiles: { id: 'p-b', full_name: 'هدى' } }).repo.read('st1');
    expect(seat).toEqual({ broughtBy: 'p-a', heldBy: 'p-b', holder: { id: 'p-b', name: 'هدى' } });
    expect((await rig(rows).repo.read('st1'))?.holder).toBeNull();
    expect(await rig().repo.read('nope')).toBeNull();
  });
});
