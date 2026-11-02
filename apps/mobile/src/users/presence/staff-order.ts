import type { PresenceWatch } from '@ab/client-core';
import type { StaffPresenceRow } from '@ab/shared';
import { byLastSeen, peerOnline } from '@/core/lib/presence';

export interface StaffLine {
  row: StaffPresenceRow;
  online: boolean;
}

/** The staff list's order (docs/33 §4): online first, then last seen (newest first), then name. */
export function staffOrder(
  staff: readonly StaffPresenceRow[],
  at: { watch: PresenceWatch; now: Date },
): StaffLine[] {
  return staff
    .map((row) => ({ row, online: peerOnline(row, at) }))
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        byLastSeen(a.row.last_seen_at, b.row.last_seen_at) ||
        a.row.name.localeCompare(b.row.name),
    );
}

/** Whom to watch when there are more than PRESENCE_WATCH_MAX: the most recently seen. */
export const watchOrder = (staff: readonly StaffPresenceRow[]): string[] =>
  [...staff].sort((a, b) => byLastSeen(a.last_seen_at, b.last_seen_at)).map((r) => r.profile_id);
