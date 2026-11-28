import type { ChannelClosedReason } from '@ab/shared';

export interface ChannelClosedProps {
  reason: ChannelClosedReason | null;
}
