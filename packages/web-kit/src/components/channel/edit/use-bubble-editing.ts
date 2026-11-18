import { channelBubbleActions } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { useChannelEdits } from './use-channel-edits';

type Mode = 'view' | 'edit' | 'delete';

interface Input {
  refs: ChannelRef;
  message: ChannelMessageView;
  /** The thread's ticking clock (windows close by themselves) and the viewer's mode. */
  at: { now: Date; mode: 'write' | 'read' };
}

/** One bubble's «تعديل» / «حذف للجميع»: what it offers now, the open step, and the two calls. */
export function useBubbleEditing({ refs, message, at }: Input) {
  const [mode, setMode] = useState<Mode>('view');
  const calls = useChannelEdits({ ...refs, messageId: message.id });
  // Who may change lives in channelBubbleActions: a writer, or the admin's moderation delete.
  const offers = channelBubbleActions({
    audience: refs.audience,
    mode: at.mode,
    message,
    now: at.now,
  });
  const done = () => setMode('view');
  return {
    mode,
    offers,
    problem: calls.problem,
    pending: calls.edit.isPending || calls.remove.isPending,
    moderator: refs.audience === 'admin',
    open: setMode,
    close: done,
    save: (body: string) => calls.edit.mutate(body, { onSuccess: done }),
    remove: () => calls.remove.mutate(undefined, { onSettled: done }),
  };
}
