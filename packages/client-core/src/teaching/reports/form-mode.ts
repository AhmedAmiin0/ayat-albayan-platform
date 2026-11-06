import type { ReportView } from '@ab/shared';

/**
 * Where one report's form stands for the teacher (owner 2026-11-06): a draft is filled and sent;
 * a sent report is read-only until «تعديل التقرير» opens it again (the same report, same id);
 * once the edit window is over it stays read-only, with the reason.
 */
export type ReportFormMode = 'draft' | 'sent' | 'editing' | 'closed';

type ModeReport = Pick<ReportView, 'status' | 'can_edit'>;

const sentMode = (editing: boolean): ReportFormMode => (editing ? 'editing' : 'sent');
const BY_STATUS: Record<ModeReport['status'], (editing: boolean) => ReportFormMode> = {
  draft: () => 'draft',
  submitted: sentMode,
};

/** The form's mode; `editing` is whether «تعديل التقرير» was pressed since the last send. */
export function reportFormMode(report: ModeReport, editing: boolean): ReportFormMode {
  if (!report.can_edit) return 'closed';
  return BY_STATUS[report.status](editing);
}

const READ_ONLY: ReadonlySet<ReportFormMode> = new Set(['sent', 'closed']);

/** The fields are shown, not editable: after a send, and after the edit window. */
export const isReadOnlyMode = (mode: ReportFormMode): boolean => READ_ONLY.has(mode);

/** What the confirmation says: the first send, or a saved edit, and when (the server's time). */
export interface SentMoment {
  kind: 'sent' | 'edited';
  at: string;
}

type MomentReport = Pick<ReportView, 'status' | 'submitted_at' | 'edited_at'>;

/** The last successful send of a submitted report, or null while a draft. */
export function sentMoment(report: MomentReport): SentMoment | null {
  if (report.status !== 'submitted' || report.submitted_at === null) return null;
  return report.edited_at === null
    ? { kind: 'sent', at: report.submitted_at }
    : { kind: 'edited', at: report.edited_at };
}

/** One send at a time: `run` gets `done`, to call when its request settles. */
export type SendGuard = (run: (done: () => void) => void) => boolean;

/**
 * A send that runs at most once at a time (keep one per form): a second tap or Enter while one
 * is in flight does nothing and returns false, whatever the button shows.
 */
export function singleFlight(): SendGuard {
  let busy = false;
  const done = () => {
    busy = false;
  };
  return (run) => {
    if (busy) return false;
    busy = true;
    try {
      run(done);
    } catch (error) {
      done();
      throw error;
    }
    return true;
  };
}

/** A checked send: the form's own check first, then the request (which calls `done` on settle). */
export interface CheckedSend {
  /** The form's problem (a reports.error key), or null when it may be sent. */
  check: () => string | null;
  /** Shows the check's result (null clears the last one). */
  show: (problem: string | null) => void;
  request: (done: () => void) => void;
}

/** Through the form's guard: a refused check frees it at once, a request when it settles. */
export function sendChecked(guard: SendGuard, send: CheckedSend): boolean {
  return guard((done) => {
    const problem = send.check();
    send.show(problem);
    const next = problem === null ? send.request : (free: () => void) => free();
    next(done);
  });
}
