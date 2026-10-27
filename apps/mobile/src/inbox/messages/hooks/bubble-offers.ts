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
}

/**
 * «نسخ النص» for a message with text; «تنزيل» only for a file this viewer may open today
 * (MessageFile's rule: our copy of a chat-view type, never a teacher, whom the API answers 403).
 */
export function bubbleOffers(m: MessageView, opts: { enabled: boolean; teacher: boolean; react?: boolean }): BubbleOffers {
  const on = opts.enabled;
  return {
    reply: on && canReply(m),
    copy: on && Boolean(m.body?.trim()),
    forward: on && canForward(m),
    download: on && !opts.teacher && m.media_url === null && isChatViewMime(m.media_mime),
    react: on && opts.react === true,
  };
}

export const offersAny = (o: BubbleOffers): boolean => o.reply || o.copy || o.forward || o.download || o.react;

/** «تنزيل الملف — خطة الحفظ.pdf», or the file's kind when it has no name. */
export const downloadLabel = (m: Pick<MessageView, 'media_name' | 'media_mime'>): string =>
  t.inbox.download.label.replace('{name}', m.media_name ?? t.inbox.media[mediaKind(m.media_mime)]);
