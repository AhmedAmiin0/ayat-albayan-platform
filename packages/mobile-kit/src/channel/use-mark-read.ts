import { channelReadPath } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiSend } from '../lib/http/api';
import { useAppActive } from '../lib/presence/use-app-active';
import { useScreenFocused } from '../ui/connecting/use-screen-focus';
import { TEACHER_CHANNELS_KEY, type ChannelRef } from './channel-api';

interface Mark {
  /** The thread's mode is 'write' (channelMode): a monitor or a closed chat never marks. */
  enabled: boolean;
  /** The newest message the API sent (never a pending row's phone clock). */
  at: string | undefined;
}

/**
 * A participant has seen the thread up to its newest message. Only while she can see it: this
 * screen focused AND the app in the foreground, so a thread left open under another tab is not
 * marked read when the app comes back. The owning assistant on a closed chat is a monitor
 * server-side (403 channel_read_only), hence the mode and not the audience. The next opening's
 * unread band starts at this mark (the page's my_last_read_at).
 */
export function useMarkRead(ref: ChannelRef, { enabled, at }: Mark): void {
  const client = useQueryClient();
  const focused = useScreenFocused();
  const active = useAppActive();
  const seen = enabled && focused && active ? at : undefined;
  const { audience, studentId } = ref;
  useEffect(() => {
    if (!seen) return;
    apiSend('POST', channelReadPath(audience, studentId), { at: seen }).then(
      () => client.invalidateQueries({ queryKey: TEACHER_CHANNELS_KEY }),
      () => undefined,
    );
  }, [seen, audience, studentId, client]);
}
