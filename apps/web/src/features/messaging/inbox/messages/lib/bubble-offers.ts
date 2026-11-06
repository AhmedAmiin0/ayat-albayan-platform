import { canForward, canReply, canSendViaWhatsApp, isChatViewMime, type MessageView } from '@ab/shared';

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
  /** «أرسل عبر واتساب» (owner 2026-11-06): admin mode, our text the 24 h window stopped. */
  whatsapp: boolean;
}

/** Who reads the bubble: teacher mode, the emoji row, and «حذف من المنصة» rights. */
export interface OfferOptions {
  teacher: boolean;
  react?: boolean;
  hide?: boolean;
  /** Admin mode (the sent-manually endpoint's messages.manage); teacher mode never. */
  admin?: boolean;
}

/** «أرسل عبر واتساب»: admin mode only (the sent-manually endpoint's permission). */
const whatsappOffer = (m: MessageView, opts: OfferOptions): boolean =>
  opts.admin === true && !m.hidden && canSendViaWhatsApp(m);

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
    whatsapp: whatsappOffer(m, opts),
  };
}

const anyTool = (o: BubbleOffers): boolean => o.reply || o.copy || o.forward || o.download;

export const offersAny = (o: BubbleOffers): boolean =>
  anyTool(o) || o.react || o.hide || o.whatsapp;
