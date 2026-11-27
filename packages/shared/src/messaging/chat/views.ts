import type { LeadSource, LeadStatus, LessonStatus, MessageDirection, MessageStatus, NumberPurpose, WaLine } from '@ab/catalog';
import type { ChatListRef } from './chat-lists';
import type { ThreadNote } from '../markers/marker-notes';
import type { ReopenFields } from './thread-reopen';
import type { MessageView } from './message-view';
import type { FamilyRingField, SubscriptionBadge, ThreadPeople } from './thread-people';

// Phase 4 responses (docs/12 §4): snake_case rows like every API response; instants ISO-8601 UTC.
/** GET /threads item: one v_threads row plus the 24 h window at response time. */
export interface ThreadView extends ThreadNote, FamilyRingField, ReopenFields {
  phone_e164: string;
  /** Guardian name ?? lead name ?? teacher name; null = an unknown number (show the phone). */
  display_name: string | null;
  last_message_id: string;
  last_direction: MessageDirection;
  last_body: string | null;
  last_template_key: string | null;
  last_status: MessageStatus;
  last_media_mime: string | null;
  /** The last message is Meta's `unsupported` (its content never reached us, e.g. 131060); absent = no. */
  last_unsupported?: boolean;
  last_message_at: string;
  last_inbound_at: string | null;
  /** Inbound rows no admin has opened yet (read_at null); a teacher's own (teacher_unread). */
  unread_count: number;
  lead_id: string | null;
  lead_name: string | null;
  lead_status: LeadStatus | null;
  lead_source: LeadSource | null;
  guardian_id: string | null;
  guardian_name: string | null;
  guardian_tz: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  /** sessionWindowOpen(last_inbound_at, now): free text allowed, else a template (or a try). */
  session_open: boolean;
  /** subscriptionBadge of the guardian's students is 'subscribed'. */
  subscribed: boolean;
  /** Family subscriptionBadge, null without a guardian; absent in an old cache. */
  badge?: SubscriptionBadge | null;
  /** familyUnpaid: a running package still owes money; absent like `badge`. */
  unpaid?: boolean;
  /** Line of the newest inbound (docs/12 §13; `calls` = the calls number, docs/28 §10); null = history or a single line. Absent in an old cache. */
  last_inbound_line?: NumberPurpose | null;
  /** Newest inbound on the chat line (docs/12 §13.7). Absent in an old cache. */
  last_chat_inbound_at?: string | null;
  /** Newest inbound on the notifications line or without a line (history). Absent in an old cache. */
  last_notifications_inbound_at?: string | null;
  /** replyLine(): the line a session text leaves from; null when closed or on a single line. */
  reply_line?: WaLine | null;
  /** Thread page only: its send line can react (false on the CRM line or a closed window). Absent = no. */
  reactable?: boolean;
}

/** GET /threads/:phone: the thread (null if the phone has no messages) and a page of messages. */
export interface ThreadDetail {
  thread: ThreadView | null;
  /** Oldest → newest; `before` (an instant) pages back. */
  messages: MessageView[];
  has_more: boolean;
  /** First page only: the guardian's / teacher's next open lessons, for the template composer. */
  lessons: ThreadLesson[];
  /** First page: guardian, lead, students and packages (an older page: empty; read pages[0]). */
  people: ThreadPeople;
  /** The lists the chat is in (docs/22 §3): callers with inbox.lists only; absent otherwise. */
  lists?: ChatListRef[];
}

/** An upcoming lesson of the thread's person: its times fill a template's variables (rule 6). */
export interface ThreadLesson {
  id: string;
  starts_at: string;
  meeting_link: string | null;
  /** The guardian's own children in it (all students for a teacher). */
  student_names: string[];
  /** The recipient's tz (the guardian's, or the teacher's). */
  tz: string;
  /** scheduled or confirmed, for the reply note; both absent in an old cache. */
  status?: LessonStatus;
  ends_at?: string;
}
