import { reactionPill, reactorLines } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { useChatActions } from '../../shared/chat-actions';

/**
 * The reactions at the foot of a bubble, on its outer side (physical, as BUBBLE_ROW: ours right, theirs left; owner 2026-10-27): theirs and ours, «👍 2» when both chose it; the
 * tooltip and the screen reader name who reacted (the chat's name, our staff member). Nothing without one.
 */
export function ReactionPill({ message: m, outbound }: { message: MessageView; outbound: boolean }) {
  const { chat } = useChatActions();
  const items = reactionPill(m.reactions);
  if (items.length === 0) return null;
  const text = items.map((i) => (i.count > 1 ? `${i.emoji} ${i.count}` : i.emoji)).join(' ');
  const who = reactorLines(m.reactions, chat.name ?? chat.phone)
    .map((l) => `${l.emoji} ${l.name ?? (l.mine ? t.inbox.reactions.academy : t.inbox.reactions.contact)}`)
    .join('، ');
  return (
    <p
      data-testid={`reaction-pill-${m.id}`}
      title={who}
      aria-label={`${t.inbox.reactions.sheet}: ${who}`}
      className={cn('mt-1.5 w-max rounded-full border border-rule bg-card px-1.5 text-sm', outbound ? 'ml-auto' : 'mr-auto')}
    >
      <span aria-hidden="true">{text}</span>
    </p>
  );
}
