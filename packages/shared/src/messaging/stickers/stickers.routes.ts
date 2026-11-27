import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import {
  gifListSchema,
  gifQuerySchema,
  stickerFavouriteSchema,
  stickerListSchema,
} from './stickers';

/** The emoji panel's stickers and GIFs; the admin and sales only, a teacher is 403. */
export const stickerPanelRoutes = {
  /** 200; this staff member's favourites, then the newest stickers of any chat. */
  list: defineRoute({ method: 'GET', path: '/threads/stickers', response: stickerListSchema }),
  /** 204; 404 message_not_found when the message is no sticker this caller may see. */
  favourite: defineRoute({
    method: 'PUT',
    path: '/threads/stickers/favourites',
    body: stickerFavouriteSchema,
    response: 'empty',
  }),
  /** 204; removes the sticker that message holds from the favourites. */
  unfavourite: defineRoute({
    method: 'DELETE',
    path: '/threads/stickers/favourites/:messageId',
    params: z.object({ messageId: id() }),
    response: 'empty',
  }),
  /** 200; a GIPHY search, or trending GIFs without words; `configured` false without a key. */
  gifs: defineRoute({
    method: 'GET',
    path: '/threads/gifs',
    query: gifQuerySchema,
    response: gifListSchema,
  }),
};
