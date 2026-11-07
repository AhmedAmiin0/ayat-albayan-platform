import { describe, expect, it, vi } from 'vitest';
import type { DriveBackupData } from './drive-backup.data';
import { reportNight } from './drive-backup.report';
import { emptySummary, type SkippedItem } from './run/summary';

function setup() {
  const state = { save: vi.fn() };
  const alerts = { skipped: vi.fn(), driveFull: vi.fn() };
  const data = { state, alerts } as unknown as DriveBackupData;
  return { data, state, alerts };
}
const now = new Date('2026-11-10T02:00:00Z');
const sum = emptySummary('2026-11-10');

describe('the night’s report', () => {
  it('a clean night: the status saved, no alert', async () => {
    const t = setup();
    await reportNight(t.data, { now, sum });
    expect(t.state.save).toHaveBeenCalledWith({
      last_run_at: now.toISOString(),
      last_error: null,
      skipped: [],
      skipped_count: 0,
      waiting: 0,
    });
    expect(t.alerts.skipped).not.toHaveBeenCalled();
    expect(t.alerts.driveFull).not.toHaveBeenCalled();
  });

  it('skipped objects are named on the status line (the first 50) and in the alert', async () => {
    const t = setup();
    const items: SkippedItem[] = Array.from({ length: 60 }, (_, i) => ({
      id: `reports/${i}`,
      size: 1,
      reason: 'read_failed',
    }));
    await reportNight(t.data, { now, sum: { ...sum, skipped: items } });
    const saved = t.state.save.mock.calls[0]?.[0] as { skipped: unknown[]; skipped_count: number };
    expect(saved.skipped).toHaveLength(50);
    expect(saved.skipped_count).toBe(60);
    expect(t.alerts.skipped).toHaveBeenCalledWith({ items, now });
  });

  it('objects waiting for room: counted, and «Drive nearly full» told', async () => {
    const t = setup();
    await reportNight(t.data, { now, sum: { ...sum, waiting: 3 } });
    expect(t.state.save).toHaveBeenCalledWith(expect.objectContaining({ waiting: 3 }));
    expect(t.alerts.driveFull).toHaveBeenCalledWith({ now });
  });
});
