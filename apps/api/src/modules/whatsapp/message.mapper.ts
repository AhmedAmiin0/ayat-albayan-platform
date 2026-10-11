import type { Tables } from '@ab/db';
import {
  clickToChatLink,
  fallbackText,
  renderTemplateBody,
  type MessageLesson,
  type MessageView,
  type RenderableTemplate,
} from '@ab/shared';
import { SENDING } from './send-plan';
import { templateParams } from './wa-json';

export type MessageRow = Tables<'messages'>;
/** A messages row with the teacher who sent it (teacher mode «بعتها»), for every view-producing read. */
export const MESSAGE_SELECT = '*, sent_by_teacher:teachers!messages_sent_by_teacher_id_fkey(display_name_ar)' as const;
/** A thread row: the message with its lesson and sending teacher embedded (ThreadsQueries.messages). */
export type ThreadMessageRow = MessageRow & {
  lesson?: MessageLesson | null;
  sent_by_teacher?: { display_name_ar: string } | null;
};

export interface MessageViewInput {
  row: ThreadMessageRow;
  /** The registry row of row.template_key (renderable()), when there is one. */
  template: RenderableTemplate | null;
  /** Signed link of params.document (report_ready), for the wa.me fallback text. */
  documentUrl?: string | null;
  /** Signed link of row.media_path (inbound media, B2). */
  mediaUrl?: string | null;
}

/**
 * Only an outbound message still waiting or failed offers the admin the wa.me fallback (R-MSG-03).
 * Not one the sender has claimed (SENDING, under its lease): Meta may be sending it right now, and
 * a hand-off then would send it twice. Once the claim resolves it is sent, queued again or failed.
 */
export function needsManualSend(row: Pick<MessageRow, 'direction' | 'status' | 'error_code'>): boolean {
  return row.direction === 'outbound' && (row.status === 'queued' || row.status === 'failed') && row.error_code !== SENDING;
}

/** The teacher who sent the row from their inbox; null for the academy or a job. */
const senderName = (row: ThreadMessageRow): string | null => row.sent_by_teacher?.display_name_ar ?? null;

/**
 * messages row → MessageView (R-MSG-05): a template row shows its rendered text; a queued or
 * failed outbound row carries the wa.me link with the same text pre-filled (R-MSG-03).
 */
export function toMessageView(input: MessageViewInput): MessageView {
  const { row, template } = input;
  const params = templateParams(row.template_params);
  const text = template
    ? fallbackText({ template, params, documentUrl: input.documentUrl ?? null })
    : (row.body ?? undefined);
  return {
    id: row.id,
    direction: row.direction,
    status: row.status,
    phone_e164: row.phone_e164,
    lead_id: row.lead_id,
    guardian_id: row.guardian_id,
    lesson_id: row.lesson_id,
    template_key: row.template_key,
    template_params: row.template_params === null ? null : params,
    body: row.body ?? (template ? renderTemplateBody(template.body_ar, params) : null),
    media_mime: row.media_mime,
    media_url: input.mediaUrl ?? null,
    reply_to_wa_id: row.reply_to_wa_id,
    interactive_payload: row.interactive_payload,
    error_code: row.error_code,
    error_text: row.error_text,
    attempts: row.attempts,
    next_attempt_at: row.next_attempt_at,
    scheduled_for: row.scheduled_for,
    sent_at: row.sent_at,
    delivered_at: row.delivered_at,
    read_at: row.read_at,
    sent_manually_at: row.sent_manually_at,
    sent_by_teacher_name: senderName(row),
    created_at: row.created_at,
    click_to_chat: needsManualSend(row) ? clickToChatLink(row.phone_e164, text) : null,
    lesson: row.lesson ?? null,
    line: row.line,
  };
}
