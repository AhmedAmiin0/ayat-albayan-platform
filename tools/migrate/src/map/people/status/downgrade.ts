// What the old status rule (before 2026-10-27) would have said, so every student it made «مشترك»
// without a current subscription is counted in the dry-run report (report/report.ts) by reason.
// Pure; the issue detail is a machine reason, never a name or phone.
import type { StudentStatus } from '@ab/shared';
import { issuesFor } from '../../../sources/sheets/issues.ts';
import type { RowIssue, SourceRef } from '../../../types.ts';
import type { OldClaim } from '../rows.ts';

/** The old rule's grounds for active, in the order they are reported. */
interface OldGrounds {
  claims: readonly OldClaim[];
  /** Any HEART «subscription» row on the guardian phone (a sibling's too). */
  payingPhone: boolean;
  /** A non-trial lesson report, attended or not. */
  chargeable: boolean;
  /** SUBS «عدد الحلقات» > 1. */
  subsRegister: boolean;
}

type DowngradeReason =
  | 'hub_current_student'
  | 'subscribed_booking_not_running'
  | 'heart_payment_not_current'
  | 'reported_lessons_only'
  | 'subs_register_only';

/** The first ground the old rule made this student active on, or null when it did not. */
export function oldActiveReason(g: OldGrounds): DowngradeReason | null {
  if (g.claims.includes('hub_current')) return 'hub_current_student';
  if (g.claims.includes('subscribed_booking')) return 'subscribed_booking_not_running';
  if (g.claims.includes('heart_row') || g.payingPhone) return 'heart_payment_not_current';
  if (g.chargeable) return 'reported_lessons_only';
  return g.subsRegister ? 'subs_register_only' : null;
}

/** A warn issue when the old rule said active and the new one does not; `detail` = reason→status. */
export function downgradeIssue(
  ref: SourceRef,
  o: { grounds: OldGrounds; status: StudentStatus },
): RowIssue | null {
  const reason = oldActiveReason(o.grounds);
  if (!reason || o.status === 'active') return null;
  return issuesFor(
    'students',
    ref,
  )({
    code: 'status_downgrade',
    severity: 'warn',
    field: 'status',
    detail: `${reason}→${o.status}`,
  });
}
