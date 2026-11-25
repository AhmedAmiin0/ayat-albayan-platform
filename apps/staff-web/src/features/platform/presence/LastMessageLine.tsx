import { lastMessageLine } from '@ab/shared';
import { viewerZone, t, PresenceStatus } from '@ab/web-kit';
import { usePresenceClock } from './use-presence-clock';

/** Meta shares no presence, so the last inbound message time is shown instead (docs/33 §4). */
export function LastMessageLine({ lastInboundAt }: { lastInboundAt: string | null }) {
  const { now, ...clock } = usePresenceClock();
  const at = { now, tz: viewerZone(), ...clock, words: t.presence };
  return <PresenceStatus online={false} text={lastMessageLine({ ...at, lastInboundAt })} />;
}
