import type { MessageView } from '@ab/shared';
import { useRef, useState } from 'react';
import { Icon, IconButton, useDismiss, t, cn } from '@ab/web-kit';
import { BubbleMenu } from './BubbleMenu';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { bubbleOffers, offersAny, type BubbleOffers } from '@/features/messaging/inbox/messages/lib/bubble-offers';
import { useBubbleTools } from '@/features/messaging/inbox/messages/lib/use-bubble-tools';
import { HideConfirm } from '@/features/messaging/inbox/messages/hide/HideConfirm';
import {
  useHideRights,
  useSignedIn,
} from '@/features/messaging/inbox/messages/hide/use-hide-rights';

export interface BubbleActionsProps {
  message: MessageView;
  /** The menu is open (the ⋯ button, or a right-click on the bubble). */
  menu: boolean;
  onMenu: (open: boolean) => void;
}

/** Teacher mode never offers download. */
export function useBubbleOffers(m: MessageView): BubbleOffers {
  const mode = useInboxMode();
  const teacher = mode === 'teacher';
  const { hide } = useHideRights();
  const react = useChatActions().reactable(m);
  const me = useSignedIn();
  return bubbleOffers(m, { teacher, react, hide: hide && !teacher, admin: mode === 'admin', me });
}

export function useHasBubbleActions(m: MessageView): boolean {
  const offers = useBubbleOffers(m);
  return useChatActions().enabled && offersAny(offers);
}

/** On touch screens only the 44px menu button shows; outside the 24 h window reply is disabled. */
export function BubbleActions({ message: m, menu, onMenu }: BubbleActionsProps) {
  const actions = useChatActions();
  const offers = useBubbleOffers(m);
  const tools = useBubbleTools();
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [asking, setAsking] = useState(false);
  const close = (focus: boolean) => {
    if (focus) trigger.current?.focus();
    onMenu(false);
  };
  useDismiss(box, { open: menu, onDismiss: (how) => close(how === 'escape') });
  if (!actions.enabled || !offersAny(offers)) return null;
  const blocked = actions.replyBlocked;
  const outbound = m.direction === 'outbound';

  return (
    <div
      ref={box}
      className={cn(
        'relative flex shrink-0 items-center self-center opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100',
        menu && 'opacity-100',
      )}
    >
      {offers.reply && (
        <IconButton
          label={t.inbox.reply.action}
          aria-disabled={blocked ? true : undefined}
          // Not a hidden copy of the notice: the composer already shows it once (e2e reads it by text).
          aria-description={blocked ?? undefined}
          title={blocked ?? t.inbox.reply.action}
          onClick={blocked ? undefined : () => actions.reply(m)}
          className="rounded-full aria-disabled:cursor-not-allowed aria-disabled:opacity-45 pointer-coarse:hidden"
        >
          <Icon name="reply" />
        </IconButton>
      )}
      <IconButton ref={trigger} label={t.inbox.reply.menu} aria-expanded={menu} className="rounded-full" onClick={() => onMenu(!menu)}>
        <Icon name="more" />
      </IconButton>
      {menu && <BubbleMenu message={m} outbound={outbound} offers={offers} tools={tools} onClose={() => close(true)} onHide={() => setAsking(true)} />}
      <HideConfirm message={m} open={asking} onClose={() => setAsking(false)} />
      {tools.toast}
    </div>
  );
}
