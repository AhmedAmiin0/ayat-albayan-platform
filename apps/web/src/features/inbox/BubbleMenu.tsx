import { canForward, canReply, type MessageView } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useChatActions } from './chat-actions';

export interface BubbleMenuProps {
  message: MessageView;
  /** Opens toward the middle of the chat: from the inline-end edge for ours. */
  outbound: boolean;
  /** The closed window's hint element, for a disabled «رد». */
  hintId: string;
  /** Closes the menu and puts focus back on its trigger (before the pick runs). */
  onClose: () => void;
}

const item =
  'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-start text-sm text-ink hover:bg-sunk aria-disabled:cursor-not-allowed aria-disabled:opacity-45 sm:min-h-9';

/**
 * The bubble's small menu (right-click, or the «خيارات الرسالة» button): «رد» and «إعادة توجيه».
 * Plain buttons like MoreMenu (no ARIA menu roles); the first takes focus, Esc closes (BubbleActions).
 */
export function BubbleMenu({ message: m, outbound, hintId, onClose }: BubbleMenuProps) {
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
        outbound ? 'end-0' : 'start-0',
      )}
    >
      {canReply(m) && (
        <button
          type="button"
          aria-disabled={blocked ? true : undefined}
          aria-describedby={blocked ? hintId : undefined}
          title={blocked ?? undefined}
          onClick={blocked ? undefined : pick(() => actions.reply(m))}
          className={item}
        >
          <Icon name="reply" className="text-ink-3" />
          {t.inbox.reply.action}
        </button>
      )}
      {/* Touch screens have no tooltip: the reason «رد» is off, in words. */}
      {canReply(m) && blocked && <p className="max-w-64 px-3 pb-1 text-2xs text-ink-3">{blocked}</p>}
      {canForward(m) && (
        <button type="button" onClick={pick(() => actions.forward(m))} className={item}>
          <Icon name="forward" className="text-ink-3" />
          {t.inbox.forward.action}
        </button>
      )}
    </div>
  );
}
