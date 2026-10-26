import type { MessageView } from '@ab/shared';
import { useRef } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { useDismiss } from '@/components/ui/overlay/use-dismiss';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { BubbleMenu } from './BubbleMenu';
import { useChatActions } from '../../shared/chat-actions';
import { useInboxMode } from '../../shared/mode';
import { bubbleOffers, offersAny, type BubbleOffers } from '../lib/bubble-offers';
import { useBubbleTools } from '../lib/use-bubble-tools';

export interface BubbleActionsProps {
  message: MessageView;
  /** The menu is open (the ⋯ button, or a right-click on the bubble). */
  menu: boolean;
  onMenu: (open: boolean) => void;
}

/** What this bubble's menu offers here (teacher mode: never «تنزيل», as MessageMedia). */
export function useBubbleOffers(m: MessageView): BubbleOffers {
  return bubbleOffers(m, { teacher: useInboxMode() === 'teacher' });
}

/** The bubble offers «رد», «نسخ», «إعادة توجيه» or «تنزيل» in this chat. */
export function useHasBubbleActions(m: MessageView): boolean {
  const offers = useBubbleOffers(m);
  return useChatActions().enabled && offersAny(offers);
}

/**
 * «رد» and «خيارات الرسالة» beside a bubble (owner 2026-10-25; «نسخ» / «تنزيل» 2026-10-26): shown on hover and on keyboard
 * focus; on touch screens only the 44px ⋯ shows, always (its menu has «رد»). Outside the 24 h window
 * «رد» stays focusable but off, with the closed-window notice as its hint. Esc and a pick put focus back on ⋯.
 */
export function BubbleActions({ message: m, menu, onMenu }: BubbleActionsProps) {
  const actions = useChatActions();
  const offers = useBubbleOffers(m);
  const tools = useBubbleTools();
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
      {menu && <BubbleMenu message={m} outbound={outbound} offers={offers} tools={tools} onClose={() => close(true)} />}
      {tools.toast}
    </div>
  );
}
