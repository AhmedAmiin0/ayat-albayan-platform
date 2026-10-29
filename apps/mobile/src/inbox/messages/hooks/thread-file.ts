import type { ThreadPdfPage } from '@ab/shared';
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, apiFetch } from '@/core/lib/http/api';
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

/** How long a signed URL stays fresh: until `expires_at` less the margin. */
export function signedStaleTime(file: { expires_at: string } | undefined, now: number = Date.now()): number {
  if (!file) return 0;
  const left = Date.parse(file.expires_at) - MARGIN_MS - now;
  return Number.isFinite(left) ? Math.max(0, left) : 0;
}

const notFailed = (query: { state: { status: string } }): boolean => query.state.status !== 'error';

/**
 * What a signed answer's query keeps (a bubble's file, a PDF page), as booking/invoice-queries.ts:
 * `noPersist` keeps signed URLs off the disk cache; an hour of cache; a failed answer is not asked
 * again on focus or reconnect, nor on a mount that already has an answer.
 */
const SIGNED_QUERY = {
  meta: { noPersist: true },
  staleTime: (query: { state: { data: { expires_at: string } | undefined } }) => signedStaleTime(query.state.data),
  gcTime: SIGNED_MS,
  refetchOnMount: notFailed,
  refetchOnWindowFocus: notFailed,
  refetchOnReconnect: notFailed,
};

/**
 * The file of one bubble (owner 2026-10-19 #1). Not under ['threads'] (as the web): a send or an
 * opened chat invalidates those, and that would sign the file again mid-play. A photo thumbnail
 * mounts it on every scroll back: an hour of cache and no retry on mount keep a 410 from asking again.
 */
export const threadFileQuery = (phone: string, messageId: string) =>
  queryOptions({
    ...SIGNED_QUERY,
    queryKey: ['thread-file', phone, messageId],
    queryFn: () => apiFetch<ThreadFile>(threadFilePath(phone, messageId)),
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

/** GET /threads/:phone/messages/:id/pdf/:page (owner 2026-10-29): one page of a chat PDF as a signed JPEG. */
export const pdfPagePath = (phone: string, messageId: string, page: number): string =>
  `${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/pdf/${page}`;

/** A 503 (one render at a time per API copy, a failed render) is worth another try; a 4xx ends there. */
const busy = (e: unknown): boolean => e instanceof ApiError && e.status === 503;
const final = (e: unknown): boolean => e instanceof ApiError && e.status >= 400 && e.status < 500;

/**
 * One page of a chat PDF with its page count and size; page 1 is the bubble's thumb, so the bubble
 * and the viewer share it. A 503 is retried 3 times (TanStack's backoff: 1 s, 2 s, 4 s) and asked
 * again when the bubble mounts again; a 4xx (410, 403, 409, 422, 400) stays for the hour.
 */
export const pdfPageQuery = (phone: string, messageId: string, page: number) =>
  queryOptions({
    ...SIGNED_QUERY,
    queryKey: ['thread-pdf', phone, messageId, page],
    queryFn: () => apiFetch<ThreadPdfPage>(pdfPagePath(phone, messageId, page)),
    retry: (failures, e) => failures < 3 && busy(e),
    retryOnMount: (query) => !final(query.state.error),
  });
