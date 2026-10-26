import type { MessageView } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { mediaKind } from '../../format';
import { useChatActions } from '../../shared/chat-actions';
import type { BubbleOffers } from '../lib/bubble-offers';
import type { BubbleTools } from '../lib/use-bubble-tools';

export interface BubbleMenuProps {
  message: MessageView;
  /** Opens toward the middle of the chat: leftward for ours (on the right), rightward for theirs. */
  outbound: boolean;
  /** Closes the menu and puts focus back on its trigger (before the pick runs). */
  onClose: () => void;
  offers: BubbleOffers;
  tools: Pick<BubbleTools, 'copy' | 'download'>;
}

/** «تنزيل الملف — خطة الحفظ.pdf», or the file's kind when it has no name. */
const downloadLabel = (m: MessageView): string =>
  t.inbox.download.label.replace('{name}', m.media_name ?? t.inbox.media[mediaKind(m.media_mime)]);

const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm text-ink hover:bg-sunk aria-disabled:cursor-not-allowed aria-disabled:opacity-45 sm:min-h-9';

/**
 * The bubble's small menu (right-click, or the «خيارات الرسالة» button), in WhatsApp's order: «رد»,
 * «نسخ» (a message with text), «إعادة توجيه», «تنزيل» (a file this viewer may open; owner 2026-10-26).
 * Plain buttons like MoreMenu (no ARIA menu roles); the first takes focus, Esc closes (BubbleActions).
 */
export function BubbleMenu({ message: m, outbound, onClose, offers, tools }: BubbleMenuProps) {
  const actions = useChatActions();
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.querySelector('button')?.focus();
  }, []);
  const blocked = actions.replyBlocked;
  const pick = (run: () => void) => () => {
    onClose();
    run();
  };
  return (
    <div
      ref={first}
      className={cn(
        'absolute top-full z-30 mt-1 grid w-max min-w-44 gap-0.5 rounded-md border border-rule bg-card p-1.5 shadow-pop',
        outbound ? 'right-0' : 'left-0',
      )}
    >
      {offers.reply && (
        <button
          type="button"
          aria-disabled={blocked ? true : undefined}
          aria-description={blocked ?? undefined}
          title={blocked ?? undefined}
          onClick={blocked ? undefined : pick(() => actions.reply(m))}
          className={item}
        >
          <Icon name="reply" className="text-ink-3" />
          {t.inbox.reply.action}
        </button>
      )}
      {/* Touch screens have no tooltip: the reason «رد» is off, in words. */}
      {offers.reply && blocked && <p className="max-w-64 px-3 pb-1 text-2xs text-ink-3">{blocked}</p>}
      {offers.copy && (
        <button type="button" aria-label={t.inbox.copy.label} onClick={pick(() => tools.copy(m))} className={item}>
          <Icon name="copy" className="text-ink-3" />
          {t.inbox.copy.action}
        </button>
      )}
      {offers.forward && (
        <button type="button" onClick={pick(() => actions.forward(m))} className={item}>
          <Icon name="forward" className="text-ink-3" />
          {t.inbox.forward.action}
        </button>
      )}
      {offers.download && (
        <button type="button" aria-label={downloadLabel(m)} onClick={pick(() => tools.download(m))} className={item}>
          <Icon name="download" className="text-ink-3" />
          {t.inbox.download.action}
        </button>
      )}
    </div>
  );
}
