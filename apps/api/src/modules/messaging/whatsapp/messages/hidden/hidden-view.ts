import type { MessageView } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';

/** Still on the customer's phone (the API cannot delete), so time, side and ticks stay. */
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
