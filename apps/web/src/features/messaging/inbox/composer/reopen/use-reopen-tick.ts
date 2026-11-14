import { reopenTick } from '@ab/client-core';
import type { MessageStatus, ReopenSent } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { threadQuery } from '@/features/messaging/inbox/api/thread-query';

/**
 * The reopen template's tick: its bubble's status in the open chat's cached pages (the polls move
 * it), read without fetching; before they load, what the thread page said.
 */
export function useReopenTick(phone: string, sent: ReopenSent): MessageStatus {
  const pages = useInfiniteQuery({ ...threadQuery(phone), enabled: false }).data?.pages ?? [];
  return reopenTick(sent, pages.flatMap((p) => p.messages));
}
