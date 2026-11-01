import { gifListSchema, type MessageView, stickerKey, stickerListSchema } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';
import { sendError } from '@/inbox/messages/hooks/message-text';
import { refreshInbox, touchInbox } from '@/inbox/thread/hooks/inbox-sync';
import {
  appendMessage,
  removeMessage,
  type ThreadCache,
  threadKey,
  threadPath,
} from '@/inbox/thread/hooks/thread-cache';

// The emoji panel's GIF and sticker tabs (owner 2026-11-01, like WhatsApp): GIPHY through the API
// (the key never reaches the app) and the stickers of every chat, plus this user's favourites.

const STICKERS_KEY = ['stickers'] as const;

/** The chat a GIF or sticker goes to, and the composer's error line for a refused send. */
export interface PanelMedia {
  phone: string;
  onError: (message: string | null) => void;
}

/** GET /threads/stickers: the favourites, then the newest of any chat. */
export function useStickers(enabled = true) {
  return useQuery({
    queryKey: STICKERS_KEY,
    queryFn: async () => stickerListSchema.parse(await apiFetch('/threads/stickers')),
    enabled,
  });
}

/** GET /threads/gifs?q=: a search, or GIPHY's trending GIFs while the box is empty. */
export function useGifs(q: string) {
  return useQuery({
    queryKey: ['gifs', q],
    queryFn: async () => gifListSchema.parse(await apiFetch(`/threads/gifs${toQueryString({ q })}`)),
    staleTime: 5 * 60_000,
  });
}

/** What the panel sends: a held sticker again, or a GIPHY GIF (the API fetches its mp4). */
type PanelSend = { kind: 'sticker'; messageId: string } | { kind: 'gif'; gifId: string };

const bodyOf = (v: PanelSend) => (v.kind === 'sticker' ? { messageId: v.messageId } : { gifId: v.gifId });

/**
 * POST /threads/:phone/sticker | gif: the row shows in the chat at once, with its ticks. The sheet
 * closes on the tap, so why a send was refused goes to the composer's line (`onError`).
 */
export function usePanelSend(phone: string, onError: (message: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: PanelSend) => {
      const row: MessageView = await apiSend('POST', `${threadPath(phone)}/${v.kind}`, {
        ...bodyOf(v),
        clientRequestId: requestId(),
      });
      return row;
    },
    onSuccess: async (row) => {
      const add = (old: ThreadCache | undefined) => appendMessage(removeMessage(old, row.id), row);
      client.setQueryData<ThreadCache>(threadKey(phone), add);
      await touchInbox(client, row);
    },
    onError: (e) => onError(sendError(e)),
    onSettled: () => refreshInbox(client, phone),
  });
}

/** «أضف إلى المفضلة» / «أزل من المفضلة» on a sticker bubble; the panel's list refetches. */
export function useStickerFavourite(m: Pick<MessageView, 'id' | 'interactive_payload'>) {
  const client = useQueryClient();
  const list = useStickers();
  const saved = list.data?.favourites.some((f) => f.key === stickerKey(m)) === true;
  const toggle = useMutation({
    mutationFn: () =>
      saved
        ? apiSend('DELETE', `/threads/stickers/favourites/${encodeURIComponent(m.id)}`)
        : apiSend('PUT', '/threads/stickers/favourites', { messageId: m.id }),
    onSettled: () => client.invalidateQueries({ queryKey: STICKERS_KEY }),
  });
  return { saved, toggle };
}
