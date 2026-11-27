import { channelKey } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { channelCalls, type ChannelRef } from '../channel-api';

/** Read only while its sheet is open; a null `messageId` reads nothing. */
export function useMessageReads(ref: ChannelRef, messageId: string | null) {
  return useQuery({
    queryKey: [...channelKey(ref.audience, ref.studentId), 'reads', messageId],
    queryFn: () =>
      channelCalls[ref.audience].reads({ studentId: ref.studentId, messageId: messageId ?? '' }),
    enabled: messageId !== null,
  });
}
