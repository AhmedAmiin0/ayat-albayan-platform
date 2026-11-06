import { sentRowOf } from '@ab/client-core';
import { hashKey, type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type ThreadCache, threadKey, threadMessages } from '@/inbox/thread/hooks/thread-cache';
import { heldSends, releaseSend } from './pinned-send';
import { dropRows } from './unconfirmed';

/**
 * Any read of the chat (the newest page, the page poll, a delta, a full read) that shows the
 * server row of a held send releases it: its id is never reused (a later text, a template, would
 * be answered with this one: lost) and its «unconfirmed» bubble goes (no bubble twice).
 */
function resolveHeld(client: QueryClient, phone: string): void {
  const rows = threadMessages(client.getQueryData<ThreadCache>(threadKey(phone)));
  const seen = heldSends(phone).filter((h) => sentRowOf(rows, h.sent, h.known) !== undefined);
  if (seen.length === 0) return;
  const ids = new Set(seen.map((h) => h.id));
  ids.forEach((id) => releaseSend(phone, id));
  client.setQueryData<ThreadCache>(threadKey(phone), (old) => dropRows(old, ids));
}

/** The open chat: every change of its cache is checked against its held sends. */
export function useResolveHeld(phone: string): void {
  const client = useQueryClient();
  useEffect(() => {
    const hash = hashKey(threadKey(phone));
    resolveHeld(client, phone);
    return client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryHash === hash) resolveHeld(client, phone);
    });
  }, [client, phone]);
}
