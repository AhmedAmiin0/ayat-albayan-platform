import {
  canCorrect,
  canForward,
  canReply,
  canSendViaWhatsApp,
  isChatViewMime,
  type CorrectionActor,
  type MessageView,
} from '@ab/shared';

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
  /** «تعديل» (owner 2026-11-07): a «تصحيح:» reply to her own sent text (any for the admin). */
  edit: boolean;
  /** Ours, not a template, no «تعديل»: shown off with why (WhatsApp's API cannot edit). */
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
  /** The signed-in staff member: «تعديل» on her own sent text (canCorrect). */
  me?: CorrectionActor | null;
}

/** «تعديل»: never in teacher mode (its bubbles have no actions). */
const editOffer = (m: MessageView, opts: OfferOptions): boolean =>
  !opts.teacher && canCorrect(m, opts.me);

/** The «تعديل» shown off: ours, not a template nor deleted, where «تعديل» is not offered. */
const noEditOffer = (m: MessageView, edit: boolean): boolean =>
  !edit && m.direction === 'outbound' && !m.template_key && !m.deleted;

/** «أرسل عبر واتساب»: admin mode only (the sent-manually endpoint's permission). */
const whatsappOffer = (m: MessageView, opts: OfferOptions): boolean =>
  opts.admin === true && !m.hidden && canSendViaWhatsApp(m);

/**
 * «نسخ» for a message with text; «تنزيل» only for a file this viewer may open today (MessageMedia's
 * rule: our copy of a chat-view type, never in teacher mode, where the API answers 403 media_forbidden).
 */
export function bubbleOffers(m: MessageView, opts: OfferOptions): BubbleOffers {
  const edit = editOffer(m, opts);
  return {
    reply: canReply(m),
    copy: Boolean(m.body?.trim()),
    forward: canForward(m),
    download: !opts.teacher && !m.media_url && isChatViewMime(m.media_mime),
    react: opts.react === true,
    hide: opts.hide === true && !m.hidden,
    edit,
    noEdit: noEditOffer(m, edit),
    whatsapp: whatsappOffer(m, opts),
  };
}

const anyTool = (o: BubbleOffers): boolean => o.reply || o.copy || o.forward || o.download;

export const offersAny = (o: BubbleOffers): boolean =>
  anyTool(o) || o.react || o.hide || o.whatsapp || o.edit;
