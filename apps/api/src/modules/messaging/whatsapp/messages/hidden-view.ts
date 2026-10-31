import type { MessageView } from '@ab/shared';
import type { ThreadMessageRow } from './message.mapper';

/**
 * «حذف من المنصة» (owner 2026-10-30): a hidden row reaches every staff reader as a placeholder: no
 * text, file, template or links, and nothing to reply to or forward. It is still on the customer's
 * phone (WhatsApp's API cannot delete it), so the time, side and ticks stay.
 */
export function withHidden(
  view: MessageView,
  row: Pick<ThreadMessageRow, 'hidden_at' | 'hider'>,
): MessageView {
  if (!row.hidden_at) return view;
  return {
    ...view,
    body: null,
    media_mime: null,
    media_url: null,
    media_name: null,
    template_key: null,
    template_params: null,
    interactive_payload: null,
    reply_to: null,
    replyable: false,
    forwardable: false,
    click_to_chat: null,
    hidden: { by_name: row.hider?.full_name ?? null, at: row.hidden_at },
  };
}
