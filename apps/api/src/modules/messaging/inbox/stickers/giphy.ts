import { baseMime, PLAYABLE_MAX_BYTES, type GifItem } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { FetchLike } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';

// GIPHY for the chat's GIF panel (owner 2026-11-01), through the api's one HTTP client (docs/36
// H-1). The key goes in the query only (never logged: whereOf keeps the path); G-rated GIFs only,
// this is a Quran academy.

const BASE = 'https://api.giphy.com/v1/gifs';
const TIMEOUT_MS = 8_000;
/** One page of the panel. */
const GIF_PAGE = 24;
/** GIPHY's media hosts (media.giphy.com, media0–4…): the only place a GIF's mp4 is read from. */
const MEDIA_URL = /^https:\/\/media\d*\.giphy\.com\//;

const size = z.coerce.number().positive();
const still = z.object({ url: z.url(), width: size, height: size });
const gifSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9]{1,64}$/),
  title: z.string().default(''),
  images: z.object({
    fixed_width: still.extend({ mp4: z.url().optional() }),
    fixed_width_downsampled: still.optional(),
    original: z.object({ mp4: z.url().optional() }).optional(),
  }),
});
type GiphyGif = z.infer<typeof gifSchema>;

/** A page: the GIFs GIPHY's schema accepts; one it cannot read is left out, never a 502. */
const listSchema = z.object({ data: z.array(z.unknown()) }).transform((page) =>
  page.data.flatMap((raw) => {
    const gif = gifSchema.safeParse(raw);
    return gif.success ? [gif.data] : [];
  }),
);
const oneSchema = z.object({ data: gifSchema });

/** Every GIPHY failure is one answer: 502 giphy_failed (the app says «أعد المحاولة»). */
const giphyFailed = (): Error => waHttpError('giphy_failed', HttpStatus.BAD_GATEWAY);

/** The panel's tile: the small animated preview (200 px wide, fewer frames when GIPHY has it). */
function toGifItem(gif: GiphyGif): GifItem {
  const shown = gif.images.fixed_width_downsampled ?? gif.images.fixed_width;
  const { url: preview, width, height } = shown;
  return { id: gif.id, title: gif.title, preview, width, height };
}

/** What WhatsApp gets: the original mp4, else the 200 px one; from GIPHY's media hosts only. */
export function mp4Of(gif: GiphyGif): string {
  const mp4 = gif.images.original?.mp4 ?? gif.images.fixed_width.mp4 ?? '';
  if (!MEDIA_URL.test(mp4)) throw giphyFailed();
  return mp4;
}

/** One client per call: the key is read per request (an admin may change it in «التكاملات»). */
export class Giphy {
  private readonly http: Http;

  constructor(
    private readonly key: string,
    fetch?: FetchLike,
  ) {
    this.http = createHttp({
      name: 'giphy',
      base: () => BASE,
      headers: () => Promise.resolve({}),
      timeoutMs: TIMEOUT_MS,
      redirect: 'error',
      errorBody: 'omit',
      errors: { default: giphyFailed },
      ...(fetch ? { fetch } : {}),
    });
  }

  /** A search, or the trending GIFs without one. */
  async list(q: string | undefined): Promise<GifItem[]> {
    const words = q ? { q, lang: 'ar' } : {};
    const query = { api_key: this.key, limit: GIF_PAGE, rating: 'g', ...words };
    const gifs = await this.http.json({ path: q ? 'search' : 'trending', query, schema: listSchema });
    return gifs.map(toGifItem);
  }

  /** The GIF's mp4 bytes, looked up by its id (the app never names a link). */
  async mp4(id: string): Promise<Uint8Array> {
    const query = { api_key: this.key };
    const path = encodeURIComponent(id);
    const { data } = await this.http.json({ path, query, schema: oneSchema });
    const max = { maxBytes: PLAYABLE_MAX_BYTES, tooLarge: giphyFailed };
    const file = await this.http.bytes({ path: mp4Of(data), ...max });
    if (baseMime(file.mime) !== 'video/mp4') throw giphyFailed();
    return file.bytes;
  }
}
