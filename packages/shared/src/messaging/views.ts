import type {
  LeadSource,
  LeadStatus,
  LessonStatus,
  MessageDirection,
  MessageStatus,
  TemplateCategory,
  TemplateStatus,
} from '../enums/index.js';
import type { TemplateButton, TemplateParams } from './templates.js';
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
  /** The teacher who sent it from their inbox (R-MSG-05 «بعتها»); null = the academy or a job. */
  sent_by_teacher_name: string | null;
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

/** GET /messaging/templates item: one message_templates row. */
export interface TemplateView {
  key: string;
  meta_name: string;
  language: string;
  category: TemplateCategory;
  header_format: 'document' | null;
  body_ar: string;
  footer_ar: string | null;
  /** Names of {{1}}, {{2}}, … in order. */
  params: string[];
  buttons: TemplateButton[];
  status: TemplateStatus;
  quality: string | null;
  meta_id: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  submitted_at: string | null;
}

/**
 * GET /messages/gate: can anything go out now (docs/12 §3.1), and if not, which gate is closed —
 * the server's MESSAGING_ENABLED (env_off), WhatsApp not configured, or the admin's switch.
 */
export interface SendGateView {
  open: boolean;
  reason: 'env_off' | 'not_configured' | 'switch_off' | null;
  /** Outbound rows waiting in the queue: they go out the moment the gate opens. */
  queued: number;
}
