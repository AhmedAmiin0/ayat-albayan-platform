import { OPEN_COURSE } from '@ab/shared';
import type { PushKind } from '@ab/catalog';
import { canOpen } from '@/core/auth/route-permissions';
import type { Can } from '@ab/mobile-kit';
import { pushField, pushKind, pushPhone, pushStudentId } from './push-data';

// The sales and classroom-assistant trees (a bell in every staff portal). Each
// map returns only its own tree's routes: never an admin URL, and never a tab the role cannot see.

const SALES_MORE = '/sales/more';

const toSalesThread = (data: unknown, can: Can) => {
  if (!canOpen(can, 'inbox')) return SALES_MORE;
  const phone = pushPhone(data);
  return phone ? `/sales/inbox/thread/${encodeURIComponent(phone)}` : '/sales/inbox';
};

const toSalesStudents = (_data: unknown, can: Can) => (canOpen(can, 'salesStudents') ? '/sales/students' : SALES_MORE);

/** A lesson goes to her today screen when she sees the academy schedule. */
const toSalesToday = (_data: unknown, can: Can) => (canOpen(can, 'salesSchedule') ? '/sales/today' : SALES_MORE);

/** R-MEET-03: meetings are back for sales (docs/16 row 12b). */
const toSalesMeetings = (_data: unknown, can: Can) => (canOpen(can, 'salesMeetings') ? '/sales/more/meetings' : SALES_MORE);

/**
 * A chat message → that student's chat, where the assistant in its seat writes
 * too (read-only only while the family chat is off or the chat is closed).
 */
const toSalesChannel = (data: unknown, can: Can) => {
  if (!canOpen(can, 'salesStudents')) return SALES_MORE;
  const student = pushStudentId(data);
  return student ? `/sales/students/channel/${student}` : '/sales/students';
};

/** A new commission opens her wallet, with self.sales_earnings. */
const toSalesWallet = (_data: unknown, can: Can) => (canOpen(can, 'salesEarnings') ? '/sales/more/earnings' : SALES_MORE);

/** Anything without a specific target opens the More screen. */
const SALES_ROUTES: Record<PushKind, (data: unknown, can: Can) => string> = {
  new_lead: toSalesThread,
  new_message: toSalesThread,
  reminder_failed: toSalesThread,
  lesson_needs_confirmation: toSalesToday,
  report_submitted: toSalesStudents,
  payment_due: toSalesStudents,
  new_student: toSalesStudents,
  meeting_invite: toSalesMeetings,
  // Admins only (settings.read); never sent to a salesperson.
  google_sync_alert: () => SALES_MORE,
  // docs/31 §2: the owning assistant hears her students' chats.
  channel_message: toSalesChannel,
  commission_earned: toSalesWallet,
  // Sent to teachers and families only for now; a salesperson would open students.
  lesson_rescheduled: toSalesStudents,
  lesson_cancelled: toSalesStudents,
  course_paused: toSalesStudents,
  course_resumed: toSalesStudents,
  // A payment for her student opens students.
  payment_received: toSalesStudents,
};

/** A package paid with no course opens that student's course wizard; null when not one. */
function toSalesCourse(data: unknown, can: Can): string | null {
  const student = pushStudentId(data);
  const wizard = pushField(data, 'open') === OPEN_COURSE && student;
  return wizard && canOpen(can, 'inbox') ? `/sales/inbox/sales-course?studentId=${student}` : null;
}

/** The sales screen a tapped push opens; null for anything that is not one of our pushes. */
export function salesRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  return kind ? (toSalesCourse(data, can) ?? SALES_ROUTES[kind](data, can)) : null;
}

const assistantHome = (can: Can) => (canOpen(can, 'assistantLessons') ? '/assistant/lessons' : '/assistant/more');

/** A meeting invite opens internal meetings; everything else her lessons. */
export function assistantRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  if (!kind) return null;
  const meetings = kind === 'meeting_invite' && canOpen(can, 'meetings') && canOpen(can, 'assistantLessons');
  return meetings ? '/assistant/lessons/meetings' : assistantHome(can);
}
