import type { MessageView } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { Icon, t, cn } from '@ab/web-kit';
import { mediaKind } from '@/features/messaging/inbox/format';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import type { BubbleOffers } from '@/features/messaging/inbox/messages/lib/bubble-offers';
import type { BubbleTools } from '@/features/messaging/inbox/messages/lib/use-bubble-tools';
import { ReactionRow } from '@/features/messaging/inbox/messages/reactions/ReactionRow';
import { HideItems } from '@/features/messaging/inbox/messages/hide/HideItems';
import { WhatsAppSendItem } from '@/features/messaging/inbox/messages/whatsapp-send';

export interface BubbleMenuProps {
  message: MessageView;
  /** Opens toward the middle of the chat: leftward for ours (on the right), rightward for theirs. */
  outbound: boolean;
  /** Closes the menu and puts focus back on its trigger (before the pick runs). */
  onClose: () => void;
  offers: BubbleOffers;
  tools: Pick<BubbleTools, 'copy' | 'download'>;
  onHide?: () => void;
}

/** Falls back to the file's kind when it has no name. */
const downloadLabel = (m: MessageView): string =>
  t.inbox.download.label.replace('{name}', m.media_name ?? t.inbox.media[mediaKind(m.media_mime)]);

const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm text-ink hover:bg-sunk aria-disabled:cursor-not-allowed aria-disabled:opacity-45 sm:min-h-9';

/** Plain buttons like MoreMenu, no ARIA menu roles; the first takes focus and Esc closes. */
export function BubbleMenu(props: BubbleMenuProps) {
  const { message: m, outbound, onClose, offers, tools, onHide } = props;
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
      {offers.react && (
        <ReactionRow message={m} onReact={(e) => pick(() => actions.react(m, e))()} />
      )}
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
      {/* Touch screens have no tooltip, so the reason reply is off is shown in words. */}
      {offers.reply && blocked && (
        <p className="max-w-64 px-3 pb-1 text-2xs text-ink-3">{blocked}</p>
      )}
      {offers.copy && (
        <button
          type="button"
          aria-label={t.inbox.copy.label}
          onClick={pick(() => tools.copy(m))}
          className={item}
        >
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
        <button
          type="button"
          aria-label={downloadLabel(m)}
          onClick={pick(() => tools.download(m))}
          className={item}
        >
          <Icon name="download" className="text-ink-3" />
          {t.inbox.download.action}
        </button>
      )}
      {offers.whatsapp && <WhatsAppSendItem message={m} pick={pick} className={item} />}
      <HideItems
        offers={offers}
        onPick={pick(() => onHide?.())}
        onEdit={blocked ? undefined : pick(() => actions.edit(m))}
        blocked={blocked}
      />
    </div>
  );
}
