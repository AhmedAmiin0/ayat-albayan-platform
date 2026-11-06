import type { MessageView, ThreadView } from '@ab/shared';

interface Provisional {
  id: string;
  phone: string;
  body: string;
  templateKey?: string | undefined;
  now?: Date;
}

/** The row an optimistic send shows until the API answers: queued, ours, no wa.me link yet. */
export function provisionalMessage(p: Provisional): MessageView {
  return {
    id: p.id,
    direction: 'outbound',
    status: 'queued',
    phone_e164: p.phone,
    lead_id: null,
    guardian_id: null,
    lesson_id: null,
    template_key: p.templateKey ?? null,
    template_params: null,
    body: p.body,
    media_mime: null,
    media_url: null,
    reply_to_wa_id: null,
    interactive_payload: null,
    error_code: null,
    error_text: null,
    attempts: 0,
    next_attempt_at: null,
    scheduled_for: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
    sent_manually_at: null,
    created_at: (p.now ?? new Date()).toISOString(),
    click_to_chat: null,
    lesson: null,
  };
}

/** A chats-list row with `row` as its last message (a send shows in the list at once). */
export const touchedThread = (th: ThreadView, row: MessageView): ThreadView => ({
  ...th,
  last_message_id: row.id,
  last_direction: row.direction,
  last_body: row.body,
  last_template_key: row.template_key,
  last_status: row.status,
  last_media_mime: row.media_mime,
  last_unsupported: false,
  last_message_at: row.created_at,
});
