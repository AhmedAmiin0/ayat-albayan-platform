import type { ReportView } from '@ab/shared';
import { msUntilClose } from './send-state.js';

type WindowFields = Pick<ReportView, 'can_edit' | 'edit_until' | 'sent_at' | 'pdf_status'>;

/**
 * A report card keeps its own copy of the report (seeded once per id:version). The window fields
 * are the server's: a refetch at the close (can_edit false), the family send (sent_at) and the
 * render (pdf_status) reach the open form, while the same version is shown (review 11-11).
 */
export function withServerWindow(local: ReportView, server: ReportView): ReportView {
  const same = local.id === server.id && local.version === server.version;
  const fields: WindowFields = {
    can_edit: server.can_edit,
    edit_until: server.edit_until,
    sent_at: server.sent_at,
    pdf_status: server.pdf_status,
  };
  return same ? { ...local, ...fields } : local;
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
