import {
  type ChatPages,
  chatStatus,
  createPatchTimes,
  foldListRows,
  foldMessages,
  type TickRow,
} from '@ab/client-core';
import type { MessageView } from '@ab/shared';

// docs/44 K1 on the web: a live event patches the chat and list caches (live-patch.ts) and marks
// its ids here; every read stamps its start and, when it lands, folds by the patch-time rule
// (@ab/client-core patch-times): only a read that started BEFORE a patch of an id keeps that
// patch's tick; a read started after it is the truth (a re-queue, stamps, replyable).

/** The web inbox's one patch clock. */
export const inboxPatches = createPatchTimes();

/** A chat page read that started at `since`, against the chat cache as it is now (after await). */
export function foldChatRead<P extends { messages: MessageView[] }>(
  cache: ChatPages | undefined,
  since: number,
  page: P,
): P {
  const fold = { times: inboxPatches, since, held: (id: string) => chatStatus(cache, id) };
  const messages = foldMessages(fold, page.messages);
  return messages === page.messages ? page : { ...page, messages };
}

/** A chats-list page read that started at `since`, against that list's cache as it is now. */
export function foldListRead<P extends { items: TickRow[] }>(
  cache: { items: readonly TickRow[] } | undefined,
  since: number,
  page: P,
): P {
  const held = new Map((cache?.items ?? []).map((r) => [r.last_message_id, r.last_status]));
  const fold = { times: inboxPatches, since, held: (id: string) => held.get(id) };
  const items = foldListRows(fold, page.items);
  return items === page.items ? page : { ...page, items };
}
