import { isPending, ticksOf, type ChannelTicks } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { ChatGlyph, type ChatGlyphName } from '@ab/web-kit/components/channel/bubble/ChatGlyph';

const c = t.studentChannel;

interface Tick {
  glyph: ChatGlyphName;
  tone: string;
  label: string;
}

const TICKS: Readonly<Record<ChannelTicks, Tick>> = {
  queued: { glyph: 'clock', tone: 'text-tick', label: c.pending },
  sent: { glyph: 'check', tone: 'text-tick', label: c.sent },
  read: { glyph: 'checks', tone: 'text-read', label: c.readByAll },
};

interface Props {
  message: ChannelMessageView;
  /** The time on the viewer's clock (channelTimeText). */
  time: string;
}

/** The tick change crossfades on the quick duration. */
export function BubbleMeta({ message: m, time }: Props) {
  const ticks = ticksOf(m);
  const tick = ticks ? TICKS[ticks] : null;
  const when = isPending(m) ? c.sending : time;
  return (
    <p className="flex items-center justify-end gap-1 text-2xs text-ink-3 tabular-nums">
      {m.edited && <span>{c.actions.edited}</span>}
      {m.edited && <span aria-hidden="true">·</span>}
      <span data-time="">{when}</span>
      {tick && (
        <span role="img" aria-label={tick.label} data-ticks={ticks} className="inline-grid">
          <ChatGlyph
            name={tick.glyph}
            className={cn('size-4 transition-colors duration-(--duration-quick)', tick.tone)}
          />
        </span>
      )}
    </p>
  );
}
