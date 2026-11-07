import { counted } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { fetchStorageBackup } from './integrations-api';

const b = t.integrations.driveBackup;
const MB = 1024 * 1024;
const GB = 1024 * MB;

/** GET /settings/integrations/storage-backup (api backup-view.ts). */
const viewSchema = z.object({
  enabled: z.boolean(),
  ready: z.object({ minio: z.boolean(), google: z.boolean() }),
  last: z
    .object({
      kind: z.enum(['full', 'incr']),
      label: z.string(),
      objects: z.number(),
      bytes_raw: z.number(),
      bytes_compressed: z.number(),
    })
    .nullable(),
  last_error: z.string().nullable(),
  quota: z.object({ limit: z.number().nullable(), free: z.number().nullable() }).nullable(),
  low_quota: z.boolean(),
});
export type DriveBackupView = z.infer<typeof viewSchema>;

/** `1.4 غيغابايت` over a gigabyte, whole megabytes below. */
export function bytesText(bytes: number): string {
  if (bytes >= GB) return b.sizeGb.replace('{n}', (bytes / GB).toFixed(1));
  return b.sizeMb.replace('{n}', String(Math.max(0, Math.round(bytes / MB))));
}

/** Why it does not run yet, or null when it is on and ready. */
const STATE: [(v: DriveBackupView) => boolean, string][] = [
  [(v) => !v.enabled, b.off],
  [(v) => !v.ready.minio, b.needsMinio],
  [(v) => !v.ready.google, b.needsGoogle],
];

function lastLine(v: DriveBackupView): string {
  const last = v.last;
  if (!last) return b.none;
  return b.last
    .replace('{name}', `${b.kinds[last.kind]} ${last.label}`)
    .replace('{objects}', counted(b.files, last.objects))
    .replace('{raw}', bytesText(last.bytes_raw))
    .replace('{compressed}', bytesText(last.bytes_compressed));
}

function quotaLine(q: DriveBackupView['quota']): string | null {
  if (!q) return null;
  const { free, limit } = q;
  if (free === null || limit === null) return b.quotaUnlimited;
  return b.quota.replace('{free}', bytesText(free)).replace('{limit}', bytesText(limit));
}

/** The status line's sentences, in order (empty ones dropped). */
export function backupLines(v: DriveBackupView): string[] {
  const blocked = STATE.find(([when]) => when(v))?.[1] ?? null;
  const error = v.last_error ? b.error.replace('{error}', v.last_error) : null;
  const lines = [blocked, lastLine(v), error, quotaLine(v.quota), b.note];
  return lines.filter((l): l is string => l !== null);
}

/** The API's gate on GET /settings/integrations/storage-backup (backup-status.controller.ts). */
const READ_PERMISSION = 'settings.write';

/**
 * The status under «التخزين»; read once when the page opens, and only by a user the API lets read
 * it (`allowed`): no request, and no false load error, for the others. A 4xx is not retried.
 */
export function useDriveBackup() {
  const allowed = usePermissions().can(READ_PERMISSION);
  const query = useQuery({
    queryKey: ['settings', 'integrations', 'storage-backup'],
    queryFn: async () => viewSchema.parse(await fetchStorageBackup()),
    enabled: allowed,
    retry: false,
  });
  return { ...query, allowed };
}
