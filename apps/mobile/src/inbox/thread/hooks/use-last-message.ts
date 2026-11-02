import { lastMessageLine } from '@ab/shared';
import { usePresenceClock } from '@/core/lib/presence';

/**
 * A WhatsApp contact's header line (docs/33 §4): Meta shares no presence, so «آخر رسالة …» from the
 * thread's last inbound message (already in the thread: no new query); '' when they never wrote.
 */
export function useLastMessageLine(lastInboundAt: string | null | undefined): string {
  const clock = usePresenceClock();
  return lastMessageLine({ ...clock, lastInboundAt: lastInboundAt ?? null });
}
