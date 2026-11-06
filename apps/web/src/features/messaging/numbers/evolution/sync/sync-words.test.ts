import type { EvolutionSyncView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { syncPartsOf, syncWordOf } from './sync-words';

const VIEW: EvolutionSyncView = {
  synced: false,
  checked_at: '2026-11-06T08:00:00Z',
  parts: { proxy: 'skipped', webhook: 'failed', settings: 'drift', instance: 'synced' },
};

describe('sync words', () => {
  it('never synced, in sync, out of sync', () => {
    expect(syncWordOf(null)).toBe('never');
    expect(syncWordOf(VIEW)).toBe('unsynced');
    expect(syncWordOf({ ...VIEW, synced: true })).toBe('synced');
  });

  it('lists the parts in a fixed order: instance, settings, webhook, proxy', () => {
    expect(syncPartsOf(VIEW)).toEqual([
      { part: 'instance', state: 'synced' },
      { part: 'settings', state: 'drift' },
      { part: 'webhook', state: 'failed' },
      { part: 'proxy', state: 'skipped' },
    ]);
  });
});
