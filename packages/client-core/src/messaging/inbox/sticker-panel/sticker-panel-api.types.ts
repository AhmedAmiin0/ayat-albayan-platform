import type {
  GifList,
  GifQuery,
  MessageView,
  StickerFavourite,
  StickerList,
  ThreadGifSend,
  ThreadStickerSend,
} from '@ab/shared';

interface ChatParams {
  phone: string;
}

export interface StickerSendInput {
  params: ChatParams;
  body: ThreadStickerSend;
}

export interface GifSendInput {
  params: ChatParams;
  body: ThreadGifSend;
}

export interface StickerPanelCalls {
  list: () => Promise<StickerList>;
  favourite: (body: StickerFavourite) => Promise<undefined>;
  unfavourite: (params: StickerFavourite) => Promise<undefined>;
  gifs: (query: GifQuery) => Promise<GifList>;
  sticker: (input: StickerSendInput) => Promise<MessageView>;
  gif: (input: GifSendInput) => Promise<MessageView>;
}
