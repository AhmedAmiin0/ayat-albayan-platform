// Counts students the old rule made subscribed without a current subscription; reasons only.
import type { StudentStatus } from '@ab/catalog';
import { issuesFor } from '../../../sources/sheets/issues.ts';
import type { RowIssue, SourceRef } from '../../../types.ts';
import type { OldClaim } from '../rows.types.ts';

/** The old rule's grounds for active, in the order they are reported. */
interface OldGrounds {
  claims: readonly OldClaim[];
  /** Any HEART «subscription» row on the guardian phone (a sibling's too). */
  payingPhone: boolean;
  /** A non-trial lesson report, attended or not. */
  chargeable: boolean;
  /** SUBS lesson count > 1. */
  subsRegister: boolean;
}

type DowngradeReason =
  | 'hub_current_student'
  | 'subscribed_booking_not_running'
  | 'heart_payment_not_current'
  | 'reported_lessons_only'
  | 'subs_register_only';

const GROUNDS: readonly (readonly [DowngradeReason, (g: OldGrounds) => boolean])[] = [
  ['hub_current_student', (g) => g.claims.includes('hub_current')],
  ['subscribed_booking_not_running', (g) => g.claims.includes('subscribed_booking')],
  ['heart_payment_not_current', (g) => g.claims.includes('heart_row') || g.payingPhone],
  ['reported_lessons_only', (g) => g.chargeable],
  ['subs_register_only', (g) => g.subsRegister],
];

/** The first ground the old rule made this student active on, or null when it did not. */
export function oldActiveReason(g: OldGrounds): DowngradeReason | null {
  return GROUNDS.find(([, holds]) => holds(g))?.[0] ?? null;
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
