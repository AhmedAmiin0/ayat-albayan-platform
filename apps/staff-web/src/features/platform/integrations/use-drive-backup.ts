import { counted } from '@ab/core';
import type { BackupStatusView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit';
import { fetchStorageBackup } from './integrations-api';
import { driveBackupKeys } from '@/features/platform/keys';

const b = t.integrations.driveBackup;
const MB = 1024 * 1024;
const GB = 1024 * MB;

export function bytesText(bytes: number): string {
  if (bytes >= GB) return b.sizeGb.replace('{n}', (bytes / GB).toFixed(1));
  return b.sizeMb.replace('{n}', String(Math.max(0, Math.round(bytes / MB))));
}

/** Why it does not run yet, or null when it is on and ready. */
const STATE: [(v: BackupStatusView) => boolean, string][] = [
  [(v) => !v.enabled, b.off],
  [(v) => !v.ready.minio, b.needsMinio],
  [(v) => !v.ready.google, b.needsGoogle],
];

function lastLine(v: BackupStatusView): string {
  const last = v.last;
  if (!last) return b.none;
  return b.last
    .replace('{day}', last.label)
    .replace('{objects}', counted(b.files, last.objects))
    .replace('{raw}', bytesText(last.bytes_raw))
    .replace('{compressed}', bytesText(last.bytes_compressed));
}

function quotaLine(q: BackupStatusView['quota']): string | null {
  if (!q) return null;
  const { free, limit } = q;
  if (free === null || limit === null) return b.quotaUnlimited;
  return b.quota.replace('{free}', bytesText(free)).replace('{limit}', bytesText(limit));
}

export function skippedLines(v: BackupStatusView): string[] {
  const { count, items } = v.skipped;
  if (count === 0) return [];
  const named = items.map((i) =>
    b.skippedItem
      .replace('{name}', i.id)
      .replace('{size}', bytesText(i.size))
      .replace('{why}', b.skipReasons[i.reason]),
  );
  return [counted(b.skipped, count), ...named];
}

/** Null when nothing waits. */
export const waitingLine = (v: BackupStatusView): string | null =>
  v.waiting > 0 ? counted(b.waiting, v.waiting) : null;

/** The status line's sentences, in order (empty ones dropped). */
export function backupLines(v: BackupStatusView): string[] {
  const blocked = STATE.find(([when]) => when(v))?.[1] ?? null;
  const error = v.last_error ? b.error.replace('{error}', v.last_error) : null;
  const lines = [blocked, lastLine(v), error, quotaLine(v.quota), b.note];
  return lines.filter((l): l is string => l !== null);
}

/** The API's gate on the status route (backupRoutes.status). */
const READ_PERMISSION = 'settings.write';

/** Only requested for permitted users, avoiding a false load error; a 4xx is not retried. */
export function useDriveBackup() {
  const allowed = usePermissions().can(READ_PERMISSION);
  const query = useQuery({
    queryKey: driveBackupKeys.backup(),
    queryFn: async () => (await fetchStorageBackup()).data,
    enabled: allowed,
    retry: false,
  });
  return { ...query, allowed };
}
