import { describe, expect, it, vi } from 'vitest';
import type { DriveBackupData } from './drive-backup.data';
import { reportFrozen, reportNight } from './drive-backup.report';
import { MemoryStore } from './run/backup-store.fakes';
import { emptySummary } from './run/summary';

// «النسخ الاحتياطي متوقف» (verification item 1): the status line and the alert, with the reason.

async function setup(open: boolean) {
  const store = new MemoryStore();
  store.today = new Date('2026-11-06T01:00:00Z');
  const row = { folderId: 'f', kind: 'full' as const, label: '2026-W45', part: 1, name: 'x' };
  const id = await store.start(row);
  await store.finish({ id, fileId: 'd', rawBytes: 1, compressedBytes: 1, skipped: 0, entries: [] });
  if (!open) await store.seal(id);
  const state = { save: vi.fn() };
  const alerts = { frozen: vi.fn(), skipped: vi.fn(), tooLarge: vi.fn() };
  const data = { store, state, alerts } as unknown as DriveBackupData;
  return { data, state, alerts };
}
const now = new Date('2026-11-10T02:00:00Z');

describe('the frozen report', () => {
  it('a full open for 4 nights: saved and told, with the reason', async () => {
    const t = await setup(true);
    const outcome = { tooLarge: 1, unread: 0, error: null };
    await reportFrozen(t.data, { folderId: 'f', now, outcome });
    const frozen = { frozen_since: '2026-11-06T01:00:00.001Z', frozen_reason: 'too_large' };
    expect(t.state.save).toHaveBeenCalledWith(frozen);
    expect(t.alerts.frozen).toHaveBeenCalledWith(expect.objectContaining({ reason: 'too_large' }));
  });

  it('nothing open: cleared, no alert', async () => {
    const t = await setup(false);
    await reportFrozen(t.data, {
      folderId: 'f',
      now,
      outcome: { tooLarge: 0, unread: 0, error: null },
    });
    expect(t.state.save).toHaveBeenCalledWith({ frozen_since: null, frozen_reason: null });
    expect(t.alerts.frozen).not.toHaveBeenCalled();
  });

  it('a night that ran: too-large objects are named in their own alert', async () => {
    const t = await setup(false);
    const sum = { ...emptySummary({ kind: 'full', label: '2026-W45' }), tooLarge: ['reports/big'] };
    await reportNight(t.data, { folderId: 'f', now, sum });
    expect(t.alerts.tooLarge).toHaveBeenCalledWith({ names: ['reports/big'], now });
    expect(t.alerts.skipped).not.toHaveBeenCalled();
  });
});
