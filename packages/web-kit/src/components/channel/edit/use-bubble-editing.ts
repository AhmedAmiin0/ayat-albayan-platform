import { menuOffers, type MenuOffers } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { useBubbleTools } from '@ab/web-kit/components/channel/bubble/bubble-tools';
import { useChannelEdits } from './use-channel-edits';

type Mode = 'view' | 'edit' | 'delete';

export type MenuPick = keyof MenuOffers;

interface Input {
  refs: ChannelRef;
  message: ChannelMessageView;
  /** The thread's ticking clock (windows close by themselves) and the viewer's mode. */
  at: { now: Date; mode: 'write' | 'read' };
}

/** Reply and info only inside a thread. */
export function useBubbleEditing({ refs, message, at }: Input) {
  const [mode, setMode] = useState<Mode>('view');
  const calls = useChannelEdits({ ...refs, messageId: message.id });
  const tools = useBubbleTools();
  const may = menuOffers({ audience: refs.audience, mode: at.mode, message, now: at.now });
  const offers: MenuOffers = {
    ...may,
    reply: may.reply && tools !== null,
    reads: may.reads && tools !== null,
  };
  const done = () => setMode('view');
  const picks: Readonly<Record<MenuPick, () => void>> = {
    reply: () => tools?.reply(message),
    reads: () => tools?.info(message),
    edit: () => setMode('edit'),
    delete: () => setMode('delete'),
  };
  return {
    mode,
    offers,
    problem: calls.problem,
    pending: calls.edit.isPending || calls.remove.isPending,
    moderator: refs.audience === 'admin',
    pick: (what: MenuPick) => picks[what](),
    close: done,
    save: (body: string) => calls.edit.mutate(body, { onSuccess: done }),
    remove: () => calls.remove.mutate(undefined, { onSettled: done }),
  };
}
