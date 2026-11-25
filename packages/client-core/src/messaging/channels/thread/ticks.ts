import type { ChannelMessageView } from '@ab/shared';
import { isPending } from './pending';

/** My message's state: on its way, stored, read by every other participant. */
export type ChannelTicks = 'queued' | 'sent' | 'read';

/**
 * The ticks of my message (owner: «read» only, as WhatsApp's two): the clock while on its way, ✓
 * sent, blue ✓✓ once every other participant has read it. None on others' or a deleted message.
 */
export function ticksOf(m: ChannelMessageView): ChannelTicks | null {
  if (!m.mine || m.deleted) return null;
  if (isPending(m)) return 'queued';
  return m.read_by_all ? 'read' : 'sent';
}
