import { CHANNEL_WRITES, channelReadPath } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiSend } from '../lib/http/api';
import { useAppActive } from '../lib/presence/use-app-active';
import { useScreenFocused } from '../ui/connecting/use-screen-focus';
import { TEACHER_CHANNELS_KEY, type ChannelRef } from './channel-api';
import { rememberReadMark } from './list/read-mark';

/**
 * A participant has seen the thread up to its newest message, sent as the API gave it (never a
 * clock of this phone). Only while she can see it: this screen focused AND the app in the
 * foreground, so a thread left open under another tab is not marked read when the app comes back.
 * A monitor never marks it read. The mark is kept on the phone too (the next unread band).
 */
export function useMarkRead(ref: ChannelRef, newestAt: string | undefined) {
  const client = useQueryClient();
  const focused = useScreenFocused();
  const active = useAppActive();
  const at = CHANNEL_WRITES[ref.audience] && focused && active ? newestAt : undefined;
  const { audience, studentId } = ref;
  useEffect(() => {
    if (!at) return;
    apiSend('POST', channelReadPath(audience, studentId), { at }).then(
      () => {
        void rememberReadMark({ audience, studentId }, at);
        return client.invalidateQueries({ queryKey: TEACHER_CHANNELS_KEY });
      },
      () => undefined,
    );
  }, [at, audience, studentId, client]);
}
