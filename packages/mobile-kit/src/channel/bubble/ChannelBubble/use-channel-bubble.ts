import { ticksOf } from '@ab/client-core';
import { useClockCycle } from '../../../lib/clock/clock-store';
import { metaText } from '../bubble-meta';
import type { ChannelBubbleProps } from './ChannelBubble.types';

export function useChannelBubble(p: ChannelBubbleProps) {
  const { message: m } = p;
  const cycle = useClockCycle();
  const status = ticksOf(m);
  const ticks = status ? { status, onHold: p.onReads } : undefined;
  const meta = metaText(m, { tz: p.tz, now: p.now, cycle });
  const named = !m.mine && !p.followUp;
  return { m, ticks, meta, named };
}
