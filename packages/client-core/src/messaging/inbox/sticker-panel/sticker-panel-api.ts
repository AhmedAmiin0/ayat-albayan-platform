import { stickerPanelRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { StickerPanelCalls } from './sticker-panel-api.types';

/** The emoji panel's stickers and GIFs on one api client; every answer parsed strictly. */
export function stickerPanelCalls(client: ApiClient): StickerPanelCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: routes.list }),
    favourite: (body) => call({ route: routes.favourite, body }),
    unfavourite: (params) => call({ route: routes.unfavourite, params }),
    gifs: (query) => call({ route: routes.gifs, query }),
  };
}
