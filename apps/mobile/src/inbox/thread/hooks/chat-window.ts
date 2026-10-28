import { sessionWindowOpen } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { threadKey, type ThreadCache } from './thread-cache';

/**
 * Whether free text may go in this chat now (WhatsApp's 24 h window since the family's last message), read
 * from the chat's cached thread, as the Composer does; an unknown chat reads closed. For screens opened over
 * the chat that fill its box (draft-store), e.g. «رابط دفع».
 */
export function chatWindowOpen(client: QueryClient, phone: string, now: Date): boolean {
  const data = client.getQueryData<ThreadCache>(threadKey(phone));
  return sessionWindowOpen(data?.pages[0]?.thread?.last_inbound_at ?? null, now);
}
