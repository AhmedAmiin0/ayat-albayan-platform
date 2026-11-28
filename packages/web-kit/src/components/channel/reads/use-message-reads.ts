import { channelKey } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { channelCalls, type ChannelRef } from '@ab/web-kit/components/channel/api';

/** Read while its dialog is open. */
export function useMessageReads(ref: ChannelRef, messageId: string) {
  return useQuery({
    queryKey: [...channelKey(ref.audience, ref.studentId), 'reads', messageId],
    queryFn: () => channelCalls[ref.audience].reads({ studentId: ref.studentId, messageId }),
  });
}
