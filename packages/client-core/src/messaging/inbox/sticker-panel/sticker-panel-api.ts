import { stickerPanelRoutes, stickerSendRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { StickerPanelCalls } from './sticker-panel-api.types';

/** The emoji panel's stickers and GIFs on one api client; every answer parsed strictly. */
export function stickerPanelCalls(client: ApiClient): StickerPanelCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: stickerPanelRoutes.list }),
    favourite: (body) => call({ route: stickerPanelRoutes.favourite, body }),
    unfavourite: (params) => call({ route: stickerPanelRoutes.unfavourite, params }),
    gifs: (query) => call({ route: stickerPanelRoutes.gifs, query }),
    sticker: ({ params, body }) => call({ route: stickerSendRoutes.sticker, params, body }),
    gif: ({ params, body }) => call({ route: stickerSendRoutes.gif, params, body }),
  };
}
