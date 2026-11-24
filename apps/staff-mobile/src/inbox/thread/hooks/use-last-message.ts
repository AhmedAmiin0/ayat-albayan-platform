import { lastMessageLine } from '@ab/shared';
import { usePresenceClock } from '@/core/lib/presence';

/** docs/33 §4: Meta shares no presence, so it uses the last inbound message; empty if none. */
export function useLastMessageLine(lastInboundAt: string | null | undefined): string {
  const clock = usePresenceClock();
  return lastMessageLine({ ...clock, lastInboundAt: lastInboundAt ?? null });
}
