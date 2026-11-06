import type { EvolutionSyncView } from '@ab/shared';

// Test fixture (not app code): a push read back with one part off.

export const syncView = (patch: Partial<EvolutionSyncView> = {}): EvolutionSyncView => ({
  synced: false,
  checked_at: '2026-11-06T08:00:00Z',
  parts: { instance: 'synced', settings: 'synced', webhook: 'drift', proxy: 'skipped' },
  ...patch,
});
