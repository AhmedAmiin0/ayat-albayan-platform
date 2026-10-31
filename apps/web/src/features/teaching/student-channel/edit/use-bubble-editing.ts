import { channelBubbleActions } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '@/features/teaching/student-channel/api';
import { useChannelEdits } from './use-channel-edits';

type Mode = 'view' | 'edit' | 'delete';

/** One bubble's «تعديل» / «حذف للجميع»: what it offers now, the open step, and the two calls. */
export function useBubbleEditing(input: { refs: ChannelRef; message: ChannelMessageView }) {
  const { refs, message } = input;
  const [mode, setMode] = useState<Mode>('view');
  const calls = useChannelEdits({ ...refs, messageId: message.id });
  const offers = channelBubbleActions({ audience: refs.audience, message, now: new Date() });
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
