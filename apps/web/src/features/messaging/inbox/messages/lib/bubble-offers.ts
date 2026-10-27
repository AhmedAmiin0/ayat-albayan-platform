import { canForward, canReply, isChatViewMime, type MessageView } from '@ab/shared';

/** What a bubble's menu offers, in WhatsApp's order: رد، نسخ، إعادة توجيه، تنزيل. */
export interface BubbleOffers {
  reply: boolean;
  copy: boolean;
  forward: boolean;
  download: boolean;
  /** The emoji row on top of the menu (owner 2026-10-27). */
  react: boolean;
}

/**
 * «نسخ» for a message with text; «تنزيل» only for a file this viewer may open today (MessageMedia's
 * rule: our copy of a chat-view type, never in teacher mode, where the API answers 403 media_forbidden).
 */
export function bubbleOffers(m: MessageView, opts: { teacher: boolean; react?: boolean }): BubbleOffers {
  return {
    reply: canReply(m),
    copy: Boolean(m.body?.trim()),
    forward: canForward(m),
    download: !opts.teacher && !m.media_url && isChatViewMime(m.media_mime),
    react: opts.react === true,
  };
}

export const offersAny = (o: BubbleOffers): boolean => o.reply || o.copy || o.forward || o.download || o.react;
