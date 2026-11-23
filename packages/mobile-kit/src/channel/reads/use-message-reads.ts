import { channelKey, channelReadsPath } from '@ab/client-core';
import { channelReadsSchema } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/http/api';
import type { ChannelRef } from '../channel-api';

/** Read only while its sheet is open; a null `messageId` reads nothing. */
export function useMessageReads(ref: ChannelRef, messageId: string | null) {
  return useQuery({
    queryKey: [...channelKey(ref.audience, ref.studentId), 'reads', messageId],
    queryFn: async () =>
      channelReadsSchema.parse(
        await apiFetch(channelReadsPath({ ...ref, messageId: messageId ?? '' })),
      ),
    enabled: messageId !== null,
  });
}
