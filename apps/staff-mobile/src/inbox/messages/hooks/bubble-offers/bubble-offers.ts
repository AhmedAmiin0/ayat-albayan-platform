import {
  canCorrect,
  canForward,
  canReply,
  type CorrectionActor,
  isChatViewMime,
  type MessageView,
} from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { mediaKind } from '@/inbox/messages/hooks/message-text';

export interface BubbleOffers {
  reply: boolean;
  copy: boolean;
  forward: boolean;
  download: boolean;
  /** The reaction row (owner 2026-10-27): ChatActions.reactable. */
  react: boolean;
  /** Staff only; never sent to WhatsApp. */
  hide: boolean;
  /** Admin only. */
  unhide: boolean;
  correct: boolean;
  noEdit: boolean;
}

interface OfferOptions {
  enabled: boolean;
  teacher: boolean;
  react?: boolean;
  /** canHideMessages / canUnhideMessages of the signed-in user (useHideRights). */
  hide?: boolean;
  unhide?: boolean;
  /** The signed-in staff member (useMeActor): who may correct. */
  me?: CorrectionActor | null;
}

const NONE: BubbleOffers = {
  ...{ reply: false, copy: false, forward: false, download: false, react: false },
  ...{ hide: false, unhide: false, correct: false, noEdit: false },
};

/** Download only for a file this viewer may open: never a teacher, whom the API answers 403. */
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

const hiddenOffers = (opts: OfferOptions): BubbleOffers => ({
  ...NONE,
  unhide: opts.enabled && opts.unhide === true,
});

function hideOffers(
  m: MessageView,
  opts: OfferOptions,
): Pick<BubbleOffers, 'hide' | 'unhide' | 'correct' | 'noEdit'> {
  const live = opts.enabled && m.deleted !== true;
  return { hide: live && opts.hide === true, unhide: false, ...editOffers(m, opts, live) };
}

function editOffers(
  m: MessageView,
  opts: OfferOptions,
  live: boolean,
): Pick<BubbleOffers, 'correct' | 'noEdit'> {
  const correct = live && canCorrect(m, opts.me);
  const ours = m.direction === 'outbound' && !m.template_key;
  return { correct, noEdit: live && ours && !correct };
}

export const offersAny = (o: BubbleOffers): boolean =>
  o.reply || o.copy || o.forward || o.download || o.react || o.hide || o.unhide || o.correct;

/** Falls back to the file's kind when it has no name. */
export const downloadLabel = (m: Pick<MessageView, 'media_name' | 'media_mime'>): string =>
  t.inbox.download.label.replace('{name}', m.media_name ?? t.inbox.media[mediaKind(m.media_mime)]);
