import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { cn } from '@/lib/utils';
import type { ChannelRef } from './api';
import { ChannelBubbleMenu } from './edit/ChannelBubbleMenu';
import { ChannelDeleteDialog } from './edit/ChannelDeleteDialog';
import { ChannelBubbleBody } from './edit/ChannelBubbleBody';
import { useBubbleEditing } from './edit/use-bubble-editing';

interface Props {
  message: ChannelMessageView;
  tz: string;
  refs: ChannelRef;
}

const a = t.studentChannel.actions;

/**
 * One message: who (the caller is «أنت»), the text with clickable links, the time (and day) on the
 * viewer's clock, «تم التعديل» after an edit, «تم حذف هذه الرسالة» instead of a deleted text;
 * «خيارات
 * الرسالة» beside it where «تعديل» / «حذف للجميع» are allowed (owner 2026-10-30).
 */
export function ChannelBubble({ message: m, tz, refs }: Props) {
  const clock = useClock();
  const tools = useBubbleEditing({ refs, message: m });
  const roles = t.studentChannel.roles;
  const who = m.mine
    ? t.studentChannel.you
    : [m.sender_name, roles[m.sender_role]].filter(Boolean).join(' · ');
  const time = channelTimeText({ iso: m.created_at, tz, now: new Date(), ...clock });
  const menu = <ChannelBubbleMenu offers={tools.offers} mine={m.mine} onPick={tools.open} />;
  return (
    <li className={cn('group flex items-start gap-1', m.mine ? 'justify-start' : 'justify-end')}>
      {!m.mine && menu}
      <div
        className={cn(
          'grid max-w-[85%] gap-1 rounded-lg border px-3 py-2 text-sm',
          m.mine ? 'border-lapis/25 bg-accent' : 'border-rule bg-raised',
        )}
      >
        <p className="text-2xs font-semibold text-ink-3">{who}</p>
        <ChannelBubbleBody message={m} tools={tools} />
        <p className="text-end text-2xs text-ink-3 tabular-nums">
          {m.edited && <span className="me-2">{a.edited}</span>}
          {time}
        </p>
      </div>
      {m.mine && menu}
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
