import { frozenReason, frozenSince, type NightOutcome } from './plan/frozen';
import { leftStuck, leftWatch, oldestLeft } from './plan/left';
import type { RunSummary } from './run/backup-run';
import type { DriveBackupData } from './drive-backup.data';

/**
 * A full open for more than 3 nights (docs/45 §5.1): «النسخ الاحتياطي متوقف» on the status line and
 * in an alert, with the reason; cleared once no full is open that long.
 */
export async function reportFrozen(
  data: DriveBackupData,
  input: { folderId: string; now: Date; outcome: NightOutcome },
): Promise<void> {
  const since = frozenSince(await data.store.archives(input.folderId), input.now);
  if (since === null) return data.state.save({ frozen_since: null, frozen_reason: null });
  const reason = frozenReason(input.outcome);
  await data.state.save({ frozen_since: since, frozen_reason: reason });
  await data.alerts.frozen({ reason, since, now: input.now });
}

/** Objects left again keep the night they were first left; 3 nights: the admins are told. */
async function reportLeft(data: DriveBackupData, input: { now: Date; left: readonly string[] }) {
  const prev = await data.state.read();
  const left = leftWatch(prev.left_watch, input);
  await data.state.save(left);
  const oldest = oldestLeft(left);
  if (leftStuck(oldest, input.now)) await data.alerts.left({ ...oldest, now: input.now });
}

/**
 * A night that ran: the status line, the objects left for later, the skipped and too-large
 * alerts, the frozen check.
 */
export async function reportNight(
  data: DriveBackupData,
  input: { folderId: string; now: Date; sum: RunSummary },
): Promise<void> {
  const { now, sum } = input;
  await data.state.save({ last_run_at: now.toISOString(), last_error: null });
  await reportLeft(data, { now, left: sum.left });
  if (sum.skipped > 0) await data.alerts.skipped({ count: sum.skipped, now });
  if (sum.tooLarge.length > 0) await data.alerts.tooLarge({ items: sum.tooLarge, now });
  const outcome = { tooLarge: sum.tooLarge.length, unread: sum.unread, error: null };
  await reportFrozen(data, { folderId: input.folderId, now, outcome });
}
