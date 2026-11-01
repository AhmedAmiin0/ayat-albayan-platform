import { z } from 'zod';
import { waSendKind } from '../chat/chat-files.js';

// WhatsApp stickers and GIFs in the chat (owner 2026-11-01, «add stickers and GIFs» like
// WhatsApp): what a bubble is, the request bodies and the lists the apps read. Pure: API, web and
// app share it.

/** A sticker bubble's side (WhatsApp's are 512×512 WebP), with no bubble around it. */
export const STICKER_SIZE = 150;

/** messages.interactive_payload of a sticker as the webhook keeps it; sha256 names the file. */
const stickerPayload = z.object({
  type: z.literal('sticker'),
  sticker: z.object({ sha256: z.string().min(1).optional() }).optional(),
});

/**
 * A GIF: one staff sent from GIPHY (`{ type: 'gif' }`), or a video the webhook flags as animated.
 * Meta's video payload has no such flag today, so a family's GIF stays a plain video.
 */
const gifPayload = z.union([
  z.object({ type: z.literal('gif') }),
  z.object({ type: z.literal('video'), video: z.object({ animated: z.literal(true) }) }),
]);

interface PayloadOf {
  media_mime: string | null;
  interactive_payload: unknown;
}

/** A sticker: WhatsApp's WebP (stickers are its only WebP) or Meta's `sticker` type. */
export const isStickerMessage = (m: PayloadOf): boolean =>
  waSendKind(m.media_mime) === 'sticker' || stickerPayload.safeParse(m.interactive_payload).success;

/** A GIF bubble: shown playing, muted and looping, as WhatsApp does. */
export const isGifMessage = (m: Pick<PayloadOf, 'interactive_payload'>): boolean =>
  gifPayload.safeParse(m.interactive_payload).success;

/** The payload a sent copy keeps: the same sticker, so the lists show it once. */
export function stickerPayloadOf(payload: unknown): z.infer<typeof stickerPayload> {
  const p = stickerPayload.safeParse(payload);
  return p.success ? p.data : { type: 'sticker' };
}

/** One sticker across its messages: WhatsApp's sha256 of the file, else the message itself. */
export function stickerKey(m: { id: string; interactive_payload: unknown }): string {
  const sha = stickerPayloadOf(m.interactive_payload).sticker?.sha256;
  return sha ? `sha:${sha}` : `msg:${m.id}`;
}

/** POST /threads/:phone/sticker: a sticker the chats already hold, sent again as it is stored. */
export const threadStickerSendSchema = z.object({ messageId: z.uuid(), clientRequestId: z.uuid() });
export type ThreadStickerSend = z.infer<typeof threadStickerSendSchema>;

/** PUT /threads/stickers/favourites: «أضف إلى المفضلة» on a sticker bubble. */
export const stickerFavouriteSchema = z.object({ messageId: z.uuid() });

/** A GIPHY GIF id: the API asks GIPHY for its mp4 itself, never a link from the app. */
export const giphyIdSchema = z.string().regex(/^[A-Za-z0-9]{1,64}$/);

/** POST /threads/:phone/gif: a GIF from the panel, sent as a WhatsApp video. */
export const threadGifSendSchema = z.object({ gifId: giphyIdSchema, clientRequestId: z.uuid() });
export type ThreadGifSend = z.infer<typeof threadGifSendSchema>;

/** GET /threads/gifs?q=: a search, or GIPHY's trending GIFs without one. */
export const gifQuerySchema = z.object({ q: z.string().trim().max(50).optional() });

/** One sticker of the panel: the message holding it (its chat signs the file) and its key. */
export const stickerItemSchema = z.object({
  message_id: z.string().min(1),
  phone: z.string().min(1),
  key: z.string().min(1),
});
export type StickerItem = z.infer<typeof stickerItemSchema>;

/** GET /threads/stickers: this staff member's favourites, then the newest stickers of any chat. */
export const stickerListSchema = z.object({
  favourites: z.array(stickerItemSchema),
  recent: z.array(stickerItemSchema),
});
export type StickerList = z.infer<typeof stickerListSchema>;

/** One GIF of the panel: its animated preview (a small GIF) and its size. */
export const gifItemSchema = z.object({
  id: giphyIdSchema,
  title: z.string(),
  preview: z.url(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type GifItem = z.infer<typeof gifItemSchema>;

/** GET /threads/gifs: `configured` false = no GIPHY key in «التكاملات» yet (no items). */
export const gifListSchema = z.object({ configured: z.boolean(), items: z.array(gifItemSchema) });
export type GifList = z.infer<typeof gifListSchema>;
