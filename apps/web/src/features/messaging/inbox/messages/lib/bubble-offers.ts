import { canForward, canReply, isChatViewMime, type MessageView } from '@ab/shared';

/** What a bubble's menu offers, in WhatsApp's order: رد، نسخ، إعادة توجيه، تنزيل. */
export interface BubbleOffers {
  reply: boolean;
  copy: boolean;
  forward: boolean;
  download: boolean;
  /** The emoji row on top of the menu (owner 2026-10-27). */
  react: boolean;
  /** «حذف من المنصة» (owner 2026-10-30): staff who reply in the inbox, never on a hidden one. */
  hide: boolean;
  /** Ours, not a template: «تعديل» shown off with why (WhatsApp's API cannot edit). */
  noEdit: boolean;
}

/** Who reads the bubble: teacher mode, the emoji row, and «حذف من المنصة» rights. */
export interface OfferOptions {
  teacher: boolean;
  react?: boolean;
  hide?: boolean;
}

/**
 * «نسخ» for a message with text; «تنزيل» only for a file this viewer may open today (MessageMedia's
 * rule: our copy of a chat-view type, never in teacher mode, where the API answers 403 media_forbidden).
 */
export function bubbleOffers(m: MessageView, opts: OfferOptions): BubbleOffers {
  return {
    reply: canReply(m),
    copy: Boolean(m.body?.trim()),
    forward: canForward(m),
    download: !opts.teacher && !m.media_url && isChatViewMime(m.media_mime),
    react: opts.react === true,
    hide: opts.hide === true && !m.hidden,
    noEdit: m.direction === 'outbound' && !m.template_key && !m.deleted,
  };
}

export const offersAny = (o: BubbleOffers): boolean =>
  o.reply || o.copy || o.forward || o.download || o.react || o.hide;
