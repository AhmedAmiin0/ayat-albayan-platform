import { CHANNEL_CLOSED_REASONS, type ChannelClosedReason } from '@ab/shared';

/**
 * The closed line's key for a page's closed_reason (each app shows
 * t.studentChannel.closedReasons[key]): absent or unknown is read as «before the subscription».
 */
export const closedReasonKey = (
  reason: ChannelClosedReason | null | undefined,
): ChannelClosedReason => CHANNEL_CLOSED_REASONS.find((r) => r === reason) ?? 'not_subscribed';
