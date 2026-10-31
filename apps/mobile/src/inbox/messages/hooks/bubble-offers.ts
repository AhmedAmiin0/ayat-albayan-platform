import { canForward, canReply, isChatViewMime, type MessageView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { mediaKind } from './message-text';

/** What a bubble's long-press menu offers, in WhatsApp's order: رد، نسخ النص، إعادة توجيه، تنزيل. */
export interface BubbleOffers {
  reply: boolean;
  copy: boolean;
  forward: boolean;
  download: boolean;
  /** The reaction row (owner 2026-10-27): ChatActions.reactable. */
  react: boolean;
  /** «حذف من المنصة» (owner 2026-10-30): staff only, never sent to WhatsApp. */
  hide: boolean;
  /** «إظهار» on a hidden message: the admin. */
  unhide: boolean;
  /** «لا يمكن تعديل رسائل واتساب من المنصة»: our text, which only the Business app can edit. */
  noEdit: boolean;
}

interface OfferOptions {
  enabled: boolean;
  teacher: boolean;
  react?: boolean;
  /** canHideMessages / canUnhideMessages of the signed-in user (useHideRights). */
  hide?: boolean;
  unhide?: boolean;
}

const NONE: BubbleOffers = {
  ...{ reply: false, copy: false, forward: false, download: false, react: false },
  ...{ hide: false, unhide: false, noEdit: false },
};

/**
 * «نسخ النص» for a message with text; «تنزيل» only for a file this viewer may open today
 * (MessageFile's rule: our copy of a chat-view type, never a teacher, whom the API answers 403).
 */
export function bubbleOffers(m: MessageView, opts: OfferOptions): BubbleOffers {
  const on = opts.enabled;
  // A hidden message is only its placeholder: the admin may show it again, nothing else.
  if (m.hidden) return hiddenOffers(opts);
  return {
    reply: on && canReply(m),
    copy: on && Boolean(m.body?.trim()),
    forward: on && canForward(m),
    download: on && !opts.teacher && m.media_url === null && isChatViewMime(m.media_mime),
    react: on && opts.react === true,
    ...hideOffers(m, opts),
  };
}

/** A hidden bubble: «إظهار» for the admin, nothing else. */
const hiddenOffers = (opts: OfferOptions): BubbleOffers => ({
  ...NONE,
  unhide: opts.enabled && opts.unhide === true,
});

/** «حذف من المنصة» for staff who may, and why our own text has no «تعديل» (WhatsApp Business app). */
function hideOffers(
  m: MessageView,
  opts: OfferOptions,
): Pick<BubbleOffers, 'hide' | 'unhide' | 'noEdit'> {
  const live = opts.enabled && m.deleted !== true;
  return {
    hide: live && opts.hide === true,
    unhide: false,
    noEdit: live && m.direction === 'outbound' && !m.template_key,
  };
}

export const offersAny = (o: BubbleOffers): boolean =>
  o.reply || o.copy || o.forward || o.download || o.react || o.hide || o.unhide;

/** «تنزيل الملف — خطة الحفظ.pdf», or the file's kind when it has no name. */
export const downloadLabel = (m: Pick<MessageView, 'media_name' | 'media_mime'>): string =>
  t.inbox.download.label.replace('{name}', m.media_name ?? t.inbox.media[mediaKind(m.media_mime)]);
