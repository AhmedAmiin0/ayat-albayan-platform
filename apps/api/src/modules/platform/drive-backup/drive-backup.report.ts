import { SKIPPED_KEPT } from './db/backup-state.repo';
import type { RunSummary } from './run/backup-run';
import type { DriveBackupData } from './drive-backup.data';

/**
 * A night that ran: the status line (the named skipped objects, those waiting for room), then
 * the alerts: skipped objects by name, and «Drive nearly full» when anything had to wait.
 */
export async function reportNight(data: DriveBackupData, input: { now: Date; sum: RunSummary }) {
  const { now, sum } = input;
  await data.state.save({
    last_run_at: now.toISOString(),
    last_error: null,
    skipped: sum.skipped.slice(0, SKIPPED_KEPT),
    skipped_count: sum.skipped.length,
    waiting: sum.waiting,
  });
  if (sum.skipped.length > 0) await data.alerts.skipped({ items: sum.skipped, now });
  if (sum.waiting > 0) await data.alerts.driveFull({ now });
}
