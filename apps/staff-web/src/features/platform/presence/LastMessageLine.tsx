import { lastMessageLine } from '@ab/shared';
import { viewerZone } from '@ab/web-kit/lib/clock-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PresenceStatus } from '@ab/web-kit/components/channel/presence/PresenceStatus';
import { usePresenceClock } from './use-presence-clock';

/** Meta shares no presence, so the last inbound message time is shown instead (docs/33 §4). */
export function LastMessageLine({ lastInboundAt }: { lastInboundAt: string | null }) {
  const { now, ...clock } = usePresenceClock();
  const at = { now, tz: viewerZone(), ...clock, words: t.presence };
  return <PresenceStatus online={false} text={lastMessageLine({ ...at, lastInboundAt })} />;
}
