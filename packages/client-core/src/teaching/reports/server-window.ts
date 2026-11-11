import type { ReportView } from '@ab/shared';
import { msUntilClose } from './send-state.js';

type WindowFields = Pick<ReportView, 'can_edit' | 'edit_until' | 'sent_at' | 'pdf_status'>;

/**
 * A report card keeps its own copy of the report (seeded once per id:version). The window fields
 * are the server's: a refetch at the close (can_edit false), the family send (sent_at) and the
 * render (pdf_status) reach the open form when the server's copy is the same version or newer (a
 * card left behind by an edit elsewhere closes too); a newer local copy waits for its refetch.
 */
export function withServerWindow(local: ReportView, server: ReportView): ReportView {
  const current = local.id === server.id && server.version >= local.version;
  const fields: WindowFields = {
    can_edit: server.can_edit,
    edit_until: server.edit_until,
    sent_at: server.sent_at,
    pdf_status: server.pdf_status,
  };
  return current ? { ...local, ...fields } : local;
}

/** A second after the close, so the server already answers can_edit = false. */
export const AFTER_CLOSE_MS = 1_000;
/** One more refetch when the server still said can_edit after the close (its clock behind ours). */
export const CLOSE_RETRY_MS = 5_000;

type CloseReport = Pick<ReportView, 'can_edit' | 'edit_until'>;

/** Round 0 waits for the close; round 1 retries once while can_edit outlived edit_until. */
const PLAN: readonly ((r: CloseReport, now: Date) => number | null)[] = [
  (r, now) => {
    const left = msUntilClose(r.edit_until, now);
    return left === null ? null : left + AFTER_CLOSE_MS;
  },
  (r, now) => (r.can_edit && msUntilClose(r.edit_until, now) === null ? CLOSE_RETRY_MS : null),
];

/**
 * When an open form refetches at its edit window's close (docs/46 B5): `round` = refetches done
 * in this open. null = nothing to wait for (a draft, a window already closed, retries spent).
 */
export function closeRefetchIn(r: CloseReport, at: { now: Date; round: number }): number | null {
  return PLAN[at.round]?.(r, at.now) ?? null;
}

interface CloseRefetchPlan {
  /** Refetches done in this open. */
  round: number;
  /** Fetch the form and the lists again (each app's query keys). */
  refetch: () => Promise<unknown>;
  /** After the refetch: count the round (the effect then plans the next one). */
  next: () => void;
}

/**
 * Starts the timer of the next close-time refetch (closeRefetchIn); returns its cleanup, for the
 * app's useWindowClose effect (web and mobile share this, only the refetch differs).
 */
export function scheduleCloseRefetch(r: CloseReport, plan: CloseRefetchPlan): () => void {
  const wait = closeRefetchIn(r, { now: new Date(), round: plan.round });
  if (wait === null) return () => undefined;
  const id = setTimeout(() => void plan.refetch().then(plan.next), wait);
  return () => clearTimeout(id);
}
