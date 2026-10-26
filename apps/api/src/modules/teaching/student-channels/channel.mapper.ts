import {
  CHANNEL_PAGE_SIZE,
  CHANNEL_SENDER_ROLES,
  type ChannelMessageView,
  type ChannelPage,
  type ChannelSenderRole,
  type TeacherChannelRow,
} from '@ab/shared';
import type { ChannelStudent } from './channel-people.queries';
import type { ChannelMessageRow, ChannelSummaryRow } from './channel.queries';

const roleOf = (r: string | null): ChannelSenderRole => CHANNEL_SENDER_ROLES.find((x) => x === r) ?? 'guardian';

/** Whitelist: the text, who (role and name), mine or not, when. Never a profile id. */
export function toMessageView(row: ChannelMessageRow, ctx: { me: string; names: ReadonlyMap<string, string> }): ChannelMessageView {
  const sender = row.sender_profile_id;
  return {
    id: row.id,
    body: row.body,
    sender_role: roleOf(row.sender_role),
    sender_name: sender ? (ctx.names.get(sender) ?? '') : '',
    mine: sender !== null && sender === ctx.me,
    created_at: row.created_at,
  };
}

/** A page read newest first (one extra row = more to load), shown oldest first. */
export function toPage(rows: readonly ChannelMessageRow[], ctx: { me: string; names: ReadonlyMap<string, string>; readOnly: boolean }): ChannelPage {
  const shown = rows.slice(0, CHANNEL_PAGE_SIZE).reverse();
  return { messages: shown.map((r) => toMessageView(r, ctx)), has_more: rows.length > CHANNEL_PAGE_SIZE, read_only: ctx.readOnly };
}

/** The teacher's list: newest activity first, then by name (Arabic collation). */
export function toTeacherRows(students: readonly ChannelStudent[], summaries: readonly ChannelSummaryRow[]): TeacherChannelRow[] {
  const byStudent = new Map(summaries.map((s) => [s.student_id, s]));
  return students
    .map((s) => {
      const sum = byStudent.get(s.id);
      const last = sum?.last_at && sum.last_body !== null ? { body: sum.last_body, sender_role: roleOf(sum.last_role), created_at: sum.last_at } : null;
      return { student_id: s.id, student_name: s.name, student_code: s.code, last_message: last, unread: sum?.unread ?? 0 };
    })
    .sort((a, b) => (b.last_message?.created_at ?? '').localeCompare(a.last_message?.created_at ?? '') || a.student_name.localeCompare(b.student_name, 'ar'));
}
