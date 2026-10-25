import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiFetch } from '@/core/lib/http/api';
import { threadPath } from '../../thread/hooks/thread-cache';

/** W6's answer: a signed URL of our own copy of the file, and its type. */
export interface ThreadFile {
  url: string;
  mime: string;
  expires_at: string;
}

/** GET /threads/:phone/messages/:id/file (W6, docs/20). */
export const threadFilePath = (phone: string, messageId: string): string =>
  `${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/file`;

/**
 * The file of one bubble (owner 2026-10-19 #1), as booking/invoice-queries.ts: signed URLs expire,
 * so `noPersist` keeps them off the disk cache. Not under ['threads'] (as the web): a send or an
 * opened chat invalidates those, and that would sign the file again mid-play.
 */
export const threadFileQuery = (phone: string, messageId: string) =>
  queryOptions({
    queryKey: ['thread-file', phone, messageId],
    queryFn: () => apiFetch<ThreadFile>(threadFilePath(phone, messageId)),
    meta: { noPersist: true },
    staleTime: 30 * 60_000,
    retry: false,
  });

/** Fetches a bubble's file only when asked (a tap): rendering the thread never signs a URL. */
export function useThreadFile(phone: string, messageId: string): () => Promise<ThreadFile> {
  const client = useQueryClient();
  return useCallback(() => client.fetchQuery(threadFileQuery(phone, messageId)), [client, phone, messageId]);
}
