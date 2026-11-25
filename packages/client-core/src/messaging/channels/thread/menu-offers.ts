import { channelBubbleActions } from '../channel-edits';
import type { ChannelAudience } from '../channels';
import type { ChannelMessageView } from '@ab/shared';
import { isPending } from './pending';

export interface MenuOffers {
  reply: boolean;
  reads: boolean;
  edit: boolean;
  delete: boolean;
}

interface OffersInput {
  audience: ChannelAudience;
  /** The thread's mode (channelMode): only a writer replies, edits or deletes. */
  mode: 'write' | 'read' | 'closed';
  message: ChannelMessageView;
  now: Date;
}

/**
 * What a long press offers on one bubble now (ChatXMenu). Who may edit or delete is the shared
 * rule (channelBubbleActions: a writer within the windows, the admin's moderation); never a
 * deleted message nor one still on its way.
 */
export function menuOffers(input: OffersInput): MenuOffers {
  const may = channelBubbleActions(input);
  const live = !input.message.deleted && !isPending(input.message);
  return {
    reply: input.mode === 'write' && live,
    reads: input.message.mine && live,
    edit: live && may.edit,
    delete: live && may.delete,
  };
}

export const offersAny = (o: MenuOffers): boolean => Object.values(o).some(Boolean);
