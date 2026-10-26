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

/** The API signs for an hour (SIGNED_URL_SECONDS.ui); a URL is re-signed 5 minutes before it ends. */
const MARGIN_MS = 5 * 60_000;
const SIGNED_MS = 60 * 60_000;

/** How long a signed URL stays fresh: until `expires_at` less the margin. An error stays put as long. */
export function signedStaleTime(file: ThreadFile | undefined, now: number = Date.now()): number {
  if (!file) return SIGNED_MS - MARGIN_MS;
  const left = Date.parse(file.expires_at) - MARGIN_MS - now;
  return Number.isFinite(left) ? Math.max(0, left) : 0;
}

/**
 * The file of one bubble (owner 2026-10-19 #1), as booking/invoice-queries.ts: signed URLs expire,
 * so `noPersist` keeps them off the disk cache. Not under ['threads'] (as the web): a send or an
 * opened chat invalidates those, and that would sign the file again mid-play. A photo thumbnail
 * mounts it on every scroll back: `retryOnMount: false` and an hour of cache keep a 410 from asking again.
 */
export const threadFileQuery = (phone: string, messageId: string) =>
  queryOptions({
    queryKey: ['thread-file', phone, messageId],
    queryFn: () => apiFetch<ThreadFile>(threadFilePath(phone, messageId)),
    meta: { noPersist: true },
    staleTime: (query) => signedStaleTime(query.state.data),
    gcTime: SIGNED_MS,
    retry: false,
    retryOnMount: false,
  });

/** Fetches a bubble's file only when asked (a tap): rendering the thread never signs a URL. */
export function useThreadFile(phone: string, messageId: string): () => Promise<ThreadFile> {
  const client = useQueryClient();
  return useCallback(() => client.fetchQuery(threadFileQuery(phone, messageId)), [client, phone, messageId]);
}

/** «تنزيل» (owner 2026-10-26): never cached, a fresh URL each tap, signed to save under the file's name. */
export const fetchDownload = (phone: string, messageId: string): Promise<ThreadFile> =>
  apiFetch<ThreadFile>(`${threadFilePath(phone, messageId)}?download=1`);
