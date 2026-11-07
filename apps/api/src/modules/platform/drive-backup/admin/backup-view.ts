import type { BackupState } from '@/modules/platform/drive-backup/db/backup-state.repo';
import type { RecentRow } from '@/modules/platform/drive-backup/db/archive-row.schema';
import type { FrozenReason } from '@/modules/platform/drive-backup/plan/frozen';
import { freeOf, isLow } from '@/modules/platform/drive-backup/run/quota';

/** GET /admin/storage-backup/status: the status line under «التخزين» (docs/45 §5). */
export interface BackupStatusView {
  enabled: boolean;
  ready: { minio: boolean; google: boolean };
  /** The latest archive (all its parts): kind, label, objects, bytes raw → compressed. */
  last: {
    kind: string;
    label: string;
    finished_at: string | null;
    objects: number;
    skipped: number;
    bytes_raw: number;
    bytes_compressed: number;
  } | null;
  last_run_at: string | null;
  last_error: string | null;
  quota: { limit: number | null; usage: number; free: number | null; at: string } | null;
  low_quota: boolean;
  /** «النسخ الاحتياطي متوقف»: a full open for more than 3 nights, since when and why. */
  frozen: { since: string; reason: FrozenReason } | null;
}

/** The newest done archive's label, its parts summed. */
export function lastArchive(rows: readonly RecentRow[]): BackupStatusView['last'] {
  const done = rows.filter((r) => r.status === 'done');
  const head = done[0];
  if (!head) return null;
  const parts = done.filter((r) => r.kind === head.kind && r.label === head.label);
  const sum = (pick: (r: RecentRow) => number) => parts.reduce((n, r) => n + pick(r), 0);
  return {
    kind: head.kind,
    label: head.label,
    finished_at: head.finished_at,
    objects: sum((r) => r.objects),
    skipped: sum((r) => r.skipped),
    bytes_raw: sum((r) => r.bytes_raw),
    bytes_compressed: sum((r) => r.bytes_compressed),
  };
}

export function quotaView(s: BackupState): BackupStatusView['quota'] {
  const usage = s.quota_usage;
  if (usage === null || s.quota_at === null) return null;
  const limit = s.quota_limit;
  return { limit, usage, free: freeOf({ limit, usage }), at: s.quota_at };
}

export const lowQuota = (q: BackupStatusView['quota']): boolean => isLow(q?.free ?? null);

export const frozenView = (s: BackupState): BackupStatusView['frozen'] =>
  s.frozen_since === null || s.frozen_reason === null
    ? null
    : { since: s.frozen_since, reason: s.frozen_reason };
