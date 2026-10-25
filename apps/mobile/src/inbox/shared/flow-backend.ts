import { searchDigits, type ForwardResult, type MessageView, type ThreadForward, type ThreadLesson, type ThreadView } from '@ab/shared';
import { FakeBackend } from '@/test/fake-backend';
import { family, child } from '../subscription/people-fixtures';
import {
  detail,
  inbound,
  message,
  meetReminder,
  plainReminder,
  PHONE,
  thread as leadRow,
} from './thread-fixtures';

// An in-memory chats API for the inbox flows: GET /threads (search, unread), GET /threads/:phone,
// POST …/text and …/template (the thread's last_* move with each send, like the real list), and
// POST /threads/forward (a copy into each open chat; a closed one is skipped, as the API does).

export const GUARDIAN_PHONE = '+966501112223';
export const LESSON: ThreadLesson = {
  id: 'l-1',
  starts_at: '2026-10-04T14:00:00Z',
  meeting_link: null,
  student_names: ['سهيلة'],
  tz: 'Asia/Riyadh',
};

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const HOUR = 3_600_000;

/** A lead (new, Facebook ad) inside the 24 h window, with one unread message from her. */
export const leadThread: ThreadView = {
  ...leadRow,
  last_direction: 'inbound',
  last_body: inbound.body,
  last_status: 'delivered',
  last_message_at: ago(HOUR),
  last_inbound_at: ago(HOUR),
  unread_count: 1,
};

/** A guardian whose last message is two days old: the session is closed, only templates go out. */
export const guardianThread: ThreadView = {
  ...leadRow,
  phone_e164: GUARDIAN_PHONE,
  display_name: 'أم يوسف',
  last_message_id: 'g1',
  last_direction: 'inbound',
  last_body: 'هل الحلقة بكرة؟',
  last_message_at: ago(48 * HOUR),
  last_inbound_at: ago(48 * HOUR),
  unread_count: 0,
  lead_id: null,
  lead_name: null,
  lead_status: null,
  lead_source: null,
  guardian_id: 'g-1',
  guardian_name: 'أم يوسف',
  session_open: false,
  subscribed: true,
  badge: 'subscribed',
};

export function inboxBackend() {
  const rows = [leadThread, guardianThread];
  const log: Record<string, MessageView[]> = {
    [PHONE]: [message({ ...inbound, created_at: ago(HOUR) })],
    [GUARDIAN_PHONE]: [
      message({ id: 'g1', phone_e164: GUARDIAN_PHONE, direction: 'inbound', status: 'delivered', body: 'هل الحلقة بكرة؟', created_at: ago(48 * HOUR) }),
    ],
  };
  const byPhone = (phone: string) => rows.find((r) => r.phone_e164 === phone);

  function record(phone: string, row: MessageView): MessageView {
    const sent = message({ ...row, phone_e164: phone, status: 'sent', created_at: new Date().toISOString() });
    log[phone] = [...(log[phone] ?? []), sent];
    const at = rows.findIndex((r) => r.phone_e164 === phone);
    const current = rows[at];
    if (current) {
      rows[at] = {
        ...current,
        last_message_id: sent.id,
        last_direction: 'outbound',
        last_body: sent.body,
        last_status: 'sent',
        last_message_at: sent.created_at,
        unread_count: 0,
      };
    }
    return sent;
  }

  const backend = new FakeBackend()
    .on('GET /threads', ({ query }) => {
      const digits = searchDigits(query['search'] ?? '');
      const text = (query['search'] ?? '').trim();
      const items = rows
        .filter((r) => (query['unread'] === 'true' ? r.unread_count > 0 : true))
        .filter((r) => (digits ? r.phone_e164.includes(digits) : (r.display_name ?? '').includes(text)))
        .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
      return { items, total: items.length, page: 1, pageSize: 25 };
    })
    .on('GET /threads/:phone', ({ params }) => {
      const phone = params['phone'] ?? '';
      const row = byPhone(phone) ?? leadThread;
      const people = phone === GUARDIAN_PHONE ? family([child()]) : undefined;
      const lessons = phone === GUARDIAN_PHONE ? [LESSON] : [];
      return detail(log[phone] ?? [], { thread: row, lessons, ...(people ? { people } : {}) });
    })
    .on('POST /threads/:phone/text', ({ params, body }) => {
      const { text, replyToMessageId } = body as { text: string; replyToMessageId?: string };
      const id = `srv-${log[params['phone'] ?? '']?.length ?? 0}`;
      return record(params['phone'] ?? '', message({ id, body: text, reply_to_message_id: replyToMessageId ?? null }));
    })
    .on('POST /threads/forward', ({ body }) => {
      const { messageId, targets } = body as ThreadForward;
      const source = Object.values(log).flat().find((m) => m.id === messageId);
      const results = targets.map((phone): ForwardResult => {
        if (!byPhone(phone)?.session_open) return { phone, sent: false, reason: 'session_closed' };
        const copy = record(phone, message({ id: `fwd-${phone}`, body: source?.body ?? null, forwarded: true }));
        return { phone, sent: true, message_id: copy.id };
      });
      return { results };
    })
    .on('POST /threads/:phone/template', ({ params }) =>
      record(params['phone'] ?? '', message({ id: 'srv-tpl', body: 'حلقة سهيلة النهاردة — 17:00', template_key: 'lesson_reminder_plain' })),
    )
    .on('GET /messages/gate', () => ({ open: true, reason: null, queued: 0 }))
    .on('GET /messaging/templates', () => [plainReminder, meetReminder])
    .on('GET /leads', () => ({ items: [], total: 0, page: 1, pageSize: 5 }));
  return { backend, rows, log };
}
