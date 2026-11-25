import { channelKey, channelReadsPath } from '@ab/client-core';
import { channelReadsSchema } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { apiFetch } from '@ab/web-kit/lib/http/api';

/** Read while its dialog is open. */
export function useMessageReads(ref: ChannelRef, messageId: string) {
  return useQuery({
    queryKey: [...channelKey(ref.audience, ref.studentId), 'reads', messageId],
    queryFn: async () =>
      channelReadsSchema.parse(await apiFetch(channelReadsPath({ ...ref, messageId }))),
  });
}
