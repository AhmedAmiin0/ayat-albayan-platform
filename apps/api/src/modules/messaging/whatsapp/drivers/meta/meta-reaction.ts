import { waTo, type GraphBody } from '../../messages/wa-components';
import type { ReactionSend } from '../../whatsapp.types';

// A message reaction (owner 2026-10-27): Meta's session message {type:'reaction'}; the same body on Kapso's
// Meta proxy. An empty emoji removes ours. Never a template: only inside the 24 h window.

export function reactionMessage(input: ReactionSend): GraphBody {
  return {
    ...{ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(input.to) },
    type: 'reaction',
    reaction: { message_id: input.messageId, emoji: input.emoji ?? '' },
  };
}
