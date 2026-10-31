import { lastMessageLine } from '@ab/shared';
import { viewerZone } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { PresenceStatus } from './PresenceStatus';
import { usePresenceClock } from './use-presence-clock';

/**
 * A WhatsApp chat's header (docs/33 §4): Meta shares no presence, so «آخر رسالة …» from the
 * thread's last inbound message on the viewer's clock and zone; nothing when they never wrote.
 */
export function LastMessageLine({ lastInboundAt }: { lastInboundAt: string | null }) {
  const { now, ...clock } = usePresenceClock();
  const at = { now, tz: viewerZone(), ...clock, words: t.presence };
  return <PresenceStatus online={false} text={lastMessageLine({ ...at, lastInboundAt })} />;
}
