import { channelBubbleActions, type ChannelAudience } from '@ab/client-core';
import type { ChannelActions, ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '@/features/teaching/student-channel/api';
import { useChannelEdits } from './use-channel-edits';

type Mode = 'view' | 'edit' | 'delete';

interface Input {
  refs: ChannelRef;
  message: ChannelMessageView;
  /** The thread's ticking clock (windows close by themselves) and the viewer's mode. */
  at: { now: Date; mode: 'write' | 'read' };
}

const NONE: ChannelActions = { edit: false, delete: false };

/**
 * Where the API accepts a change: a participant's open channel (mode 'write'), or the admin's
 * moderation (delete only). A monitor, the owning assistant on a closed chat, gets 403
 * channel_read_only: never offered.
 */
const mayChange = (audience: ChannelAudience, mode: 'write' | 'read'): boolean =>
  mode === 'write' || audience === 'admin';

/** One bubble's «تعديل» / «حذف للجميع»: what it offers now, the open step, and the two calls. */
export function useBubbleEditing({ refs, message, at }: Input) {
  const [mode, setMode] = useState<Mode>('view');
  const calls = useChannelEdits({ ...refs, messageId: message.id });
  const offers = mayChange(refs.audience, at.mode)
    ? channelBubbleActions({ audience: refs.audience, message, now: at.now })
    : NONE;
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
