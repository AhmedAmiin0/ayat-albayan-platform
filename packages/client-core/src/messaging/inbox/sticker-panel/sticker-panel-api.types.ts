import type { GifList, GifQuery, StickerFavourite, StickerList } from '@ab/shared';

export interface StickerPanelCalls {
  list: () => Promise<StickerList>;
  favourite: (body: StickerFavourite) => Promise<undefined>;
  unfavourite: (params: StickerFavourite) => Promise<undefined>;
  gifs: (query: GifQuery) => Promise<GifList>;
}
