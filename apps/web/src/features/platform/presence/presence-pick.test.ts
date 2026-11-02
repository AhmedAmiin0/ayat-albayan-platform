import type { PresencePeer } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { bestPeer, presenceOrder, withOnline } from './presence-pick';

const NOW = new Date('2026-10-30T12:00:00.000Z');
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const peer = (id: string, lastSeenAt: string | null): PresencePeer => ({
  profile_id: id,
  role: 'teacher',
  last_seen_at: lastSeenAt,
});
const live = (ids: string[]) => ({ live: true, online: new Set(ids) });
const down = { live: false, online: new Set<string>() };

describe('presence-pick (docs/33 §4)', () => {
  it('a live socket decides: present is online, a recent last seen alone is not', () => {
    const rows = withOnline([peer('a', ago(0)), peer('b', ago(30))], { watch: live(['b']), now: NOW });
    expect(rows.map((r) => r.online)).toEqual([false, true]);
  });

  it('without Realtime a last seen under two minutes old reads as online', () => {
    const rows = withOnline([peer('a', ago(1)), peer('b', ago(5)), peer('c', null)], {
      watch: down,
      now: NOW,
    });
    expect(rows.map((r) => r.online)).toEqual([true, false, false]);
  });

  it('orders online first, then the newest last seen, never seen last', () => {
    const rows = withOnline([peer('never', null), peer('old', ago(90)), peer('new', ago(10)), peer('on', ago(300))], {
      watch: live(['on']),
      now: NOW,
    });
    expect(presenceOrder(rows).map((r) => r.profile_id)).toEqual(['on', 'new', 'old', 'never']);
    expect(bestPeer(rows)?.profile_id).toBe('on');
  });

  it('no one: no best peer', () => {
    expect(bestPeer<PresencePeer>([])).toBeUndefined();
  });
});
