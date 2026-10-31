import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { LinkedBody } from '@/components/ui/display/linked-body';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { cn } from '@/lib/utils';

interface Props {
  message: ChannelMessageView;
  tz: string;
  /** The thread's one ticking clock (ChannelThread): bubbles gain their date at midnight. */
  now: Date;
}

/** One message: who (the caller is «أنت»), the text with clickable links, the time (and day) on the viewer's clock. */
export function ChannelBubble({ message: m, tz, now }: Props) {
  const clock = useClock();
  const who = m.mine ? t.studentChannel.you : [m.sender_name, t.studentChannel.roles[m.sender_role]].filter(Boolean).join(' · ');
  return (
    <li className={cn('flex', m.mine ? 'justify-start' : 'justify-end')}>
      <div className={cn('grid max-w-[85%] gap-1 rounded-lg border px-3 py-2 text-sm', m.mine ? 'border-lapis/25 bg-accent' : 'border-rule bg-raised')}>
        <p className="text-2xs font-semibold text-ink-3">{who}</p>
        <LinkedBody text={m.body} />
        <p className="text-end text-2xs text-ink-3 tabular-nums">{channelTimeText({ iso: m.created_at, tz, now, ...clock })}</p>
      </div>
    </li>
  );
}
