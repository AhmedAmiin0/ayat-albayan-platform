import { channelKey, channelReadsPath } from '@ab/client-core';
import { channelReadsSchema } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ChannelRef } from '#/components/channel/api.ts';
import { apiFetch } from '#/lib/http/index.ts';

/**
 * «من قرأ الرسالة» (GET …/messages/:id/reads, parsed): who of the chat has read one message and
 * when, and who not yet. Read while its dialog is open.
 */
export function useMessageReads(ref: ChannelRef, messageId: string) {
  return useQuery({
    queryKey: [...channelKey(ref.audience, ref.studentId), 'reads', messageId],
    queryFn: async () =>
      channelReadsSchema.parse(await apiFetch(channelReadsPath({ ...ref, messageId }))),
  });
}
