import type { Tables } from '@ab/db';
import {
  clickToChatLink,
  fallbackText,
  renderTemplateBody,
  type MessageLesson,
  type MessageView,
  type RenderableTemplate,
} from '@ab/shared';
import { templateParams } from './wa-json';

export type MessageRow = Tables<'messages'>;
/** A thread row: the message with its lesson embedded (ThreadsQueries.messages). */
export type ThreadMessageRow = MessageRow & { lesson?: MessageLesson | null };

export interface MessageViewInput {
  row: ThreadMessageRow;
  /** The registry row of row.template_key (renderable()), when there is one. */
  template: RenderableTemplate | null;
  /** Signed link of params.document (report_ready), for the wa.me fallback text. */
  documentUrl?: string | null;
  /** Signed link of row.media_path (inbound media, B2). */
  mediaUrl?: string | null;
}

/** Only an outbound message still waiting or failed offers the admin the wa.me fallback (R-MSG-03). */
export function needsManualSend(row: Pick<MessageRow, 'direction' | 'status'>): boolean {
  return row.direction === 'outbound' && (row.status === 'queued' || row.status === 'failed');
}

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
    created_at: row.created_at,
    click_to_chat: needsManualSend(row) ? clickToChatLink(row.phone_e164, text) : null,
    lesson: row.lesson ?? null,
  };
}
