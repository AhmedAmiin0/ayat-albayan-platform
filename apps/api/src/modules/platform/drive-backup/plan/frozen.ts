import type { ArchiveRow } from './archive.types';
import { openFull } from './decide';

/** A full open for longer than this: the backup is frozen and the admins are told why. */
const FROZEN_AFTER_MS = 3 * 86_400_000;

export const FROZEN_REASONS = [
  'too_large',
  'drive_full',
  'unread',
  'incomplete',
  'failed',
] as const;
export type FrozenReason = (typeof FROZEN_REASONS)[number];

/**
 * When the open full started (its first part), if that is more than 3 nights ago; else null. A
 * full that cannot seal (unreadable objects, Drive full, failing nights) never
 * goes quiet: the status line and the alert say so.
 */
export function frozenSince(rows: readonly ArchiveRow[], now: Date): string | null {
  const label = openFull(rows);
  const starts = rows
    .filter((r) => r.status === 'done' && r.kind === 'full' && r.label === label)
    .map((r) => r.started_at)
    .sort();
  const since = starts[0];
  const old = since !== undefined && now.getTime() - Date.parse(since) > FROZEN_AFTER_MS;
  return old ? since : null;
}

/** The night's outcome, as far as sealing goes (what backup-run.ts reports). */
export interface NightOutcome {
  tooLarge: number;
  unread: number;
  error: 'drive_full' | 'other' | null;
}

const WHY: [(n: NightOutcome) => boolean, FrozenReason][] = [
  [(n) => n.error === 'drive_full', 'drive_full'],
  [(n) => n.error === 'other', 'failed'],
  // An unread object keeps a full open; a too-large one does not (round 4): unread is named first.
  [(n) => n.unread > 0, 'unread'],
  [(n) => n.tooLarge > 0, 'too_large'],
];

/** Why the open full did not seal tonight: the first that applies, else «not finished yet». */
export const frozenReason = (n: NightOutcome): FrozenReason =>
  WHY.find(([when]) => when(n))?.[1] ?? 'incomplete';
