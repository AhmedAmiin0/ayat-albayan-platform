import type { MessageStatus } from '@ab/shared';
import { laterStatus } from './later-status.js';
import type { TickRow } from './list-ticks.js';

// docs/44 K1: a live event is an instant visual patch; the reads stay the truth. A read that
// STARTED BEFORE a patch may land after it with the older status: only for such a read, and only
// for the ids that patch moved, the held (patched) status is re-applied over the read's one (the
// event's own ordering, laterStatus). A read that started after the patch always wins (a real
// re-queue failed → queued, stamps, replyable).

/** Most patched ids remembered (the oldest dropped: no read stays in flight that long). */
export const PATCH_TIMES_MAX = 500;

/** One app's patch clock (a counter, not the wall clock: two marks never share a time). */
export interface PatchTimes {
  /** A read starts: its stamp (keep it until the read lands). */
  start(): number;
  /** These ids were patched by a live event now. */
  mark(ids: Iterable<string>): void;
  /** `id` was patched after the read stamped `since` started. */
  patchedAfter(id: string, since: number): boolean;
}

export function createPatchTimes(max = PATCH_TIMES_MAX): PatchTimes {
  const times = new Map<string, number>();
  let clock = 0;
  return {
    start: () => clock,
    mark(ids) {
      clock += 1;
      // Read once (a Map's keys() is a one-shot iterator); re-inserted at the end, so the cap
      // drops the ids patched longest ago.
      const marked = [...ids];
      marked.forEach((id) => times.delete(id));
      marked.forEach((id) => times.set(id, clock));
      [...times.keys()].slice(0, Math.max(0, times.size - max)).forEach((id) => times.delete(id));
    },
    patchedAfter: (id, since) => (times.get(id) ?? -1) > since,
  };
}

/** A read landing: the app's clock, the read's stamp, the status held NOW (after the await). */
export interface ReadFold {
  times: PatchTimes;
  since: number;
  held: (id: string) => MessageStatus | undefined;
}

/** The status to show for `id`: the read's, or the held one re-applied when patched since. */
export function foldStatus(fold: ReadFold, id: string, read: MessageStatus): MessageStatus {
  const held = fold.held(id);
  const patched = held !== undefined && fold.times.patchedAfter(id, fold.since);
  return patched ? laterStatus(read, held) : read;
}

/** The same array when nothing moved (no re-render). */
const sameOr = <T>(rows: T[], out: T[]): T[] => (out.every((r, i) => r === rows[i]) ? rows : out);

/** A read's messages folded (foldStatus); every other field comes from the read. */
export function foldMessages<M extends { id: string; status: MessageStatus }>(
  fold: ReadFold,
  rows: M[],
): M[] {
  const out = rows.map((m) => {
    const status = foldStatus(fold, m.id, m.status);
    return status === m.status ? m : { ...m, status };
  });
  return sameOr(rows, out);
}

/** A read's chats-list rows folded by their last message (foldStatus). */
export function foldListRows<R extends TickRow>(fold: ReadFold, rows: R[]): R[] {
  const out = rows.map((r) => {
    const status = foldStatus(fold, r.last_message_id, r.last_status);
    return status === r.last_status ? r : { ...r, last_status: status };
  });
  return sameOr(rows, out);
}
