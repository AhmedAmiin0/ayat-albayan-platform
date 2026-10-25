import type {
  LeadSource,
  LeadStatus,
  LessonStatus,
  MessageDirection,
  MessageStatus,
} from '../enums/index.js';
import type { WaLine } from '../enums/messaging.js';
import type { ChatListRef } from './chat-lists.js';
import type { MessageQuote } from './reply-forward.js';
import type { TemplateParams } from './templates.js';
import type { SubscriptionBadge, ThreadPeople } from './thread-people.js';

// Phase 4 responses (docs/12 §4): snake_case rows like every API response; instants ISO-8601 UTC.

/** GET /threads item: one v_threads row plus the 24 h window at response time. */
export interface ThreadView {
  phone_e164: string;
  /** Guardian name ?? lead name ?? teacher name; null = an unknown number (show the phone). */
  display_name: string | null;
  last_message_id: string;
  last_direction: MessageDirection;
  last_body: string | null;
  last_template_key: string | null;
  last_status: MessageStatus;
  last_media_mime: string | null;
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
  /** sessionWindowOpen(last_inbound_at, now): free text allowed, else only a template. */
  session_open: boolean;
  /** subscriptionBadge(the guardian's students) === 'subscribed': the «مشترك» tag. */
  subscribed: boolean;
  /** Family subscriptionBadge, null without a guardian: «اشتراكه خلص» and «مشترك». Absent in an old cache. */
  badge?: SubscriptionBadge | null;
  /** familyUnpaid: a running package still owes money, the «مش مدفوع» tag. Absent like `badge`. */
  unpaid?: boolean;
  /** Line of the newest inbound (docs/12 §13); null = history or a single line. Absent in an old cache. */
  last_inbound_line?: WaLine | null;
  /** Newest inbound on the chat line (docs/12 §13.7). Absent in an old cache. */
  last_chat_inbound_at?: string | null;
  /** Newest inbound on the notifications line or without a line (history). Absent in an old cache. */
  last_notifications_inbound_at?: string | null;
  /** replyLine(): the line a session text leaves from; null when closed or on a single line. */
  reply_line?: WaLine | null;
}

/** One messages row in a thread (R-MSG-05). */
export interface MessageView {
  id: string;
  direction: MessageDirection;
  status: MessageStatus;
  phone_e164: string;
  lead_id: string | null;
  guardian_id: string | null;
  lesson_id: string | null;
  template_key: string | null;
  template_params: TemplateParams | null;
  /** Inbound or session text as stored; for a template row, the rendered template text. */
  body: string | null;
  media_mime: string | null;
  /** Signed Storage URL (1 h) of a downloaded inbound or outbound file; null until downloaded. */
  media_url: string | null;
  reply_to_wa_id: string | null;
  /** Our row of the message this one answers (same chat); null when none or not ours. Absent in an old cache. */
  reply_to_message_id?: string | null;
  /** The message this one answers (same chat), when we hold it (owner 2026-10-25). Absent in an old cache. */
  reply_to?: MessageQuote | null;
  /** WhatsApp knows it (it has a wamid): «رد» may quote it. Absent in an old cache. */
  replyable?: boolean;
  /** A text or a file we can copy: «إعادة توجيه». Absent in an old cache. */
  forwardable?: boolean;
  /** Staff forwarded it from another message (our inbox only: WhatsApp shows no flag). */
  forwarded?: boolean;
  interactive_payload: unknown;
  error_code: string | null;
  error_text: string | null;
  attempts: number;
  next_attempt_at: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  sent_manually_at: string | null;
  /** @deprecated Read sender_name (D4); still filled for old mobile builds and cached rows. */
  sent_by_teacher_name?: string | null;
  /** A sent file's name (D2); null for inbound, text and template rows. */
  media_name?: string | null;
  /** Staff who sent it: the teacher's display_name_ar, else profiles.full_name; null = automatic, history or inbound (D4). */
  sender_name?: string | null;
  /** Outbound queued by the platform with no staff behind it (created_by null, dedup_key set). Not send-stale's isAutomatic. */
  automatic?: boolean;
  /** Line received on / sent from (docs/12 §13); null = history or a single line. Absent in an old cache. */
  line?: WaLine | null;
  created_at: string;
  /** R-MSG-03 wa.me link with the fallback text; only on outbound queued / failed rows. */
  click_to_chat: string | null;
  /**
   * The lesson of lesson_id as it is now (thread pages only; null elsewhere): what a guardian's
   * «تمام» actually did — «اتأكدت حلقة …» only when it is confirmed.
   */
  lesson: MessageLesson | null;
}

export interface MessageLesson {
  starts_at: string;
  status: LessonStatus;
}

/** GET /threads/:phone: the thread (null if the phone has no messages) and a page of messages. */
export interface ThreadDetail {
  thread: ThreadView | null;
  /** Oldest → newest; `before` (an instant) pages back. */
  messages: MessageView[];
  has_more: boolean;
  /** First page only: the guardian's / teacher's next open lessons, for the template composer. */
  lessons: ThreadLesson[];
  /**
   * First page: the guardian, the lead and the guardian's students with their packages. An older
   * page (`before`) carries an empty one: clients read pages[0].
   */
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
}
