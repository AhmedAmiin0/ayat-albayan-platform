import { defineRoute, id, phoneE164 } from '@ab/core';
import { z } from 'zod';
import {
  gifListSchema,
  gifQuerySchema,
  stickerFavouriteSchema,
  stickerListSchema,
  threadGifSendSchema,
  threadStickerSendSchema,
} from './stickers';
import { messageViewSchema } from '../chat/message-view';

const access = { permissions: ['inbox.read'], tags: ['inbox'] } as const;
const sender = { permissions: ['inbox.send'], tags: ['inbox'] } as const;
const byPhone = z.object({ phone: phoneE164 });

/** The emoji panel's stickers and GIFs; the admin and sales only, a teacher is 403. */
export const stickerPanelRoutes = {
  /** 200; this staff member's favourites, then the newest stickers of any chat. */
  list: defineRoute({
    method: 'GET',
    path: '/threads/stickers',
    response: stickerListSchema,
    ...access,
  }),
  /** 204; 404 message_not_found when the message is no sticker this caller may see. */
  favourite: defineRoute({
    method: 'PUT',
    path: '/threads/stickers/favourites',
    body: stickerFavouriteSchema,
    response: 'empty',
    ...access,
  }),
  /** 204; removes the sticker that message holds from the favourites. */
  unfavourite: defineRoute({
    method: 'DELETE',
    path: '/threads/stickers/favourites/:messageId',
    params: z.object({ messageId: id() }),
    response: 'empty',
    ...access,
  }),
  /** 200; a GIPHY search, or trending GIFs without words; `configured` false without a key. */
  gifs: defineRoute({
    method: 'GET',
    path: '/threads/gifs',
    query: gifQuerySchema,
    response: gifListSchema,
    ...access,
  }),
};

/**
 * A sticker or GIF from the panel into a chat: admin and sales; a bad body is 400 first, then a
 * teacher is 403 files_forbidden, even on a bad phone. A repeated clientRequestId answers the
 * first row.
 */
export const stickerSendRoutes = {
  /** 201; a sticker the chats already hold, sent again as it is stored. */
  sticker: defineRoute({
    method: 'POST',
    path: '/threads/:phone/sticker',
    params: byPhone,
    body: threadStickerSendSchema,
    response: messageViewSchema,
    ...sender,
  }),
  /** 201; a GIPHY GIF, fetched by the API and sent as a WhatsApp video. */
  gif: defineRoute({
    method: 'POST',
    path: '/threads/:phone/gif',
    params: byPhone,
    body: threadGifSendSchema,
    response: messageViewSchema,
    ...sender,
  }),
};
