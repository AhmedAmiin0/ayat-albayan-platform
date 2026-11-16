import {
  CHANNEL_PAGE_SIZE,
  type ChannelClosedReason,
  type ChannelPage,
  type ChannelSenderRole,
  type TeacherChannelRow,
} from '@ab/shared';
import {
  roleOf,
  toMessageView,
  type ViewContext,
} from '@/modules/teaching/student-channels/views/message-view';
import type { ChannelStudent } from './channel-people.repo';
import type { ChannelMessageRow, ChannelSummaryRow } from './channel.repo';

/** A page read newest first (one extra row = more to load), shown oldest first. */
interface PageContext extends ViewContext {
  readOnly: boolean;
  closedReason: ChannelClosedReason | null;
  studentName: string;
  open: boolean;
  channelId: string;
}

export function toPage(rows: readonly ChannelMessageRow[], ctx: PageContext): ChannelPage {
  const shown = rows.slice(0, CHANNEL_PAGE_SIZE).reverse();
  const messages = shown.map((r) => toMessageView(r, ctx));
  return {
    student_name: ctx.studentName,
    messages,
    has_more: rows.length > CHANNEL_PAGE_SIZE,
    read_only: ctx.readOnly,
    open: ctx.open,
    closed_reason: ctx.open ? null : ctx.closedReason,
    channel_id: ctx.channelId,
  };
}

/**
 * What counts as unread for a participant: everyone else's messages, never their own side's (a
 * co-teacher's, the other family login's, a co-owner assistant's).
 */
const UNREAD_ROLES: Readonly<Record<ChannelSenderRole, readonly ChannelSenderRole[]>> = {
  teacher: ['guardian', 'student', 'sales'],
  guardian: ['teacher', 'sales'],
  student: ['teacher', 'sales'],
  sales: ['teacher', 'guardian', 'student'],
};

export const unreadRolesFor = (role: ChannelSenderRole): readonly ChannelSenderRole[] =>
  UNREAD_ROLES[role];

/** The teacher's list: newest activity first, then by name (Arabic collation). */
export function toTeacherRows(
  students: readonly ChannelStudent[],
  summaries: readonly ChannelSummaryRow[],
): TeacherChannelRow[] {
  const byStudent = new Map(summaries.map((s) => [s.student_id, s]));
  return students
    .map((s) => {
      const sum = byStudent.get(s.id);
      const last =
        sum?.last_at && sum.last_body !== null
          ? lastMessage({ ...sum, last_at: sum.last_at, last_body: sum.last_body })
          : null;
      return {
        student_id: s.id,
        student_name: s.name,
        student_code: s.code,
        last_message: last,
        unread: sum?.unread ?? 0,
      };
    })
    .sort(
      (a, b) =>
        (b.last_message?.created_at ?? '').localeCompare(a.last_message?.created_at ?? '') ||
        a.student_name.localeCompare(b.student_name, 'ar'),
    );
}

/** A list preview: a message deleted for everyone shows as deleted, never its text. */
function lastMessage(
  sum: ChannelSummaryRow & { last_at: string; last_body: string },
): TeacherChannelRow['last_message'] {
  const deleted = sum.last_deleted === true;
  return {
    body: deleted ? '' : sum.last_body,
    sender_role: roleOf(sum.last_role),
    created_at: sum.last_at,
    deleted,
  };
}
