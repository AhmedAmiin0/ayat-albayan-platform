import type { MessageView, ThreadDetail } from '@ab/shared';
import { hashKey, type InfiniteData, type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { resolveBox } from '@/features/messaging/inbox/composer/lib/unconfirmed';
import { resolveQuote } from '@/features/messaging/inbox/composer/quote/quote-id';

const detailKey = (phone: string) => ['threads', 'detail', phone];

/** Every row of the open chat's cache (threadQuery's pages). */
export function chatRows(client: QueryClient, phone: string): MessageView[] {
  const data = client.getQueryData<InfiniteData<ThreadDetail>>(detailKey(phone));
  return (data?.pages ?? []).flatMap((p) => p.messages);
}

/**
 * docs/44 BUG7 (H1): every change of the chat's cache (a full read, a delta merge) is checked
 * against the box's and «عرض سعر»'s unconfirmed sends: one whose server row shows is confirmed,
 * and its id is never reused for a later, different message (the server would replay the first).
 */
export function useUnconfirmedWatch(phone: string): void {
  const client = useQueryClient();
  useEffect(() => {
    const hash = hashKey(detailKey(phone));
    const check = () => {
      const rows = chatRows(client, phone);
      resolveBox(phone, rows);
      resolveQuote(phone, rows);
    };
    check();
    return client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryHash === hash) check();
    });
  }, [client, phone]);
}
