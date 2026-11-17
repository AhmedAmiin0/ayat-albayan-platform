import { channelBubbleActions, type ChannelAudience } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';

export interface MenuOffers {
  reply: boolean;
  /** «معلومات الرسالة»: who read my message. */
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
 * What a long press offers on one bubble now (ChatXMenu). Edit and delete only where the API takes
 * them: a participant in write mode within the windows (channelBubbleActions), or the admin's
 * moderation delete; never a read-only monitor (the API answers channel_read_only).
 */
export function menuOffers(input: OffersInput): MenuOffers {
  const may = channelBubbleActions(input);
  const writes = input.mode === 'write';
  const changes = writes || input.audience === 'admin';
  const live = !input.message.deleted;
  return {
    reply: writes && live,
    reads: input.message.mine && live,
    edit: changes && may.edit,
    delete: changes && may.delete,
  };
}

export const offersAny = (o: MenuOffers): boolean => Object.values(o).some(Boolean);
