import type { PushKind } from '@ab/shared';
import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { pushKind, pushPhone } from './push-data';

// The sales and classroom-assistant trees (owner 2026-10-12: a bell in every staff portal). Each
// map returns only its own tree's routes: never an admin URL, and never a tab the role cannot see.

export const SALES_MORE = '/sales/more';

const toSalesThread = (data: unknown, can: Can) => {
  if (!canOpen(can, 'inbox')) return SALES_MORE;
  const phone = pushPhone(data);
  return phone ? `/sales/inbox/thread/${encodeURIComponent(phone)}` : '/sales/inbox';
};

const toSalesStudents = (_data: unknown, can: Can) => (canOpen(can, 'salesStudents') ? '/sales/students' : SALES_MORE);

/** R-MEET-03: «الاجتماعات» is back for sales (docs/16 row 12b, reversed 2026-10-12). */
const toSalesMeetings = (_data: unknown, can: Can) => (canOpen(can, 'salesMeetings') ? '/sales/more/meetings' : SALES_MORE);

/**
 * A message → that number's chat in «المحادثات» (the list without a phone); a new student, a
 * report or a payment due → «الطلاب»; a meeting invite → «الاجتماعات» (with meetings.read); anything
 * else (a lesson to confirm) → «المزيد».
 */
const SALES_ROUTES: Record<PushKind, (data: unknown, can: Can) => string> = {
  new_lead: toSalesThread,
  new_message: toSalesThread,
  reminder_failed: toSalesThread,
  lesson_needs_confirmation: () => SALES_MORE,
  report_submitted: toSalesStudents,
  payment_due: toSalesStudents,
  new_student: toSalesStudents,
  meeting_invite: toSalesMeetings,
  // Admins only (settings.read); never sent to a salesperson.
  google_sync_alert: () => SALES_MORE,
};

/** The sales screen a tapped push opens; null for anything that is not one of our pushes. */
export function salesRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  return kind ? SALES_ROUTES[kind](data, can) : null;
}

const assistantHome = (can: Can) => (canOpen(can, 'assistantLessons') ? '/assistant/lessons' : '/assistant/more');

/** A meeting invite → «اجتماعات داخلية» (under «حلقاتي»); everything else → «حلقاتي». */
export function assistantRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  if (!kind) return null;
  const meetings = kind === 'meeting_invite' && canOpen(can, 'meetings') && canOpen(can, 'assistantLessons');
  return meetings ? '/assistant/lessons/meetings' : assistantHome(can);
}
