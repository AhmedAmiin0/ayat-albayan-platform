import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useClock, cn } from '#/lib/index.ts';
import type { ChannelRef } from './api';
import { BubbleCard } from './bubble/BubbleCard';
import { rowAttrs } from './bubble/jump';
import { ChannelBubbleMenu } from './edit/ChannelBubbleMenu';
import { ChannelDeleteDialog } from './edit/ChannelDeleteDialog';
import { useBubbleEditing } from './edit/use-bubble-editing';

interface Props {
  message: ChannelMessageView;
  tz: string;
  refs: ChannelRef;
  /** The thread's one ticking clock (ChannelThread): bubbles gain their date at midnight. */
  now: Date;
  /** This viewer's mode: «تعديل» / «حذف للجميع» only where the API accepts them. */
  mode: 'write' | 'read';
  /** The same sender again, nothing between: no name line (channelRows). */
  followUp?: boolean;
  /** Arrived while the chat was open: it fades up once (never on the first load). */
  arrived?: boolean;
}

/** Mine at the inline end (owner 2026-10-27, «like whatsapp»), the others' at the start. */
const rowClass = (mine: boolean, arrived: boolean): string =>
  cn(
    'group flex scroll-my-24 items-start gap-1',
    mine ? 'justify-end' : 'justify-start',
    arrived && 'animate-fade-up',
  );

/**
 * One message (FamChatWebThread): the bubble (BubbleCard) with «خيارات الرسالة» beside it toward
 * the middle where anything is offered now (owner 2026-10-30): «ردّ», «تعديل», «حذف للجميع»,
 * «معلومات الرسالة»; the delete confirm when asked.
 */
export function ChannelBubble({ message: m, tz, refs, now, mode, followUp, arrived }: Props) {
  const clock = useClock();
  const tools = useBubbleEditing({ refs, message: m, at: { now, mode } });
  const time = channelTimeText({ iso: m.created_at, tz, now, ...clock });
  const menu = <ChannelBubbleMenu offers={tools.offers} mine={m.mine} onPick={tools.pick} />;
  return (
    <li {...rowAttrs(m.id)} className={rowClass(m.mine, arrived === true)}>
      {m.mine && menu}
      <BubbleCard message={m} followUp={followUp === true} tools={tools} time={time} />
      {!m.mine && menu}
      {tools.mode === 'delete' && (
        <ChannelDeleteDialog
          moderator={tools.moderator}
          pending={tools.pending}
          onConfirm={tools.remove}
          onClose={tools.close}
        />
      )}
    </li>
  );
}
