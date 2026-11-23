import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  channelCountKeys,
  markChannelRead,
  type ChannelRef,
} from '#/components/channel/api.ts';
import { usePageVisible } from './use-page-visible';

interface Mark {
  /** A participant's open channel (mode 'write'); a monitor never marks. */
  enabled: boolean;
  /** The newest message shown; nothing to mark while there is none. */
  at: string | undefined;
}

/**
 * Marks the thread read up to the newest message shown, only while the tab is visible: a
 * message that arrives in a hidden tab stays unread until the tab is shown again.
 */
export function useMarkRead(ref: ChannelRef, { enabled, at }: Mark): void {
  const client = useQueryClient();
  const visible = usePageVisible();
  const { audience, studentId } = ref;
  useEffect(() => {
    if (!enabled || !visible || !at) return;
    const keys = channelCountKeys(studentId);
    const refresh = () =>
      Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
    void markChannelRead({ audience, studentId, at }).then(refresh, () => undefined);
  }, [enabled, visible, at, audience, studentId, client]);
}
