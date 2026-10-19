import type { MessageView } from './views.js';

// Who sent an outgoing bubble (owner 2026-10-19 #4): a staff name, «رسالة تلقائية», or nothing.

export type SenderLine = { kind: 'name'; name: string } | { kind: 'auto' } | null;

type SenderFields = Pick<MessageView, 'direction'> &
  Partial<Pick<MessageView, 'sender_name' | 'sent_by_teacher_name' | 'automatic'>>;

/** null for inbound rows and for imported history (no staff behind it, not queued by a job). */
export function senderLine(m: SenderFields): SenderLine {
  if (m.direction !== 'outbound') return null;
  const name = m.sender_name || m.sent_by_teacher_name;
  if (name) return { kind: 'name', name };
  return m.automatic ? { kind: 'auto' } : null;
}
