import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import { threadPath } from '@/inbox/thread-cache';
import type { MediaUrl, ThreadMediaItem } from './contract';

// Admin-only (a teacher gets 403). Signed URLs expire, so `noPersist` keeps these off the disk
// cache (lib/query-client): a restart would show a dead thumbnail.
const meta = { noPersist: true };

/** GET /threads/:phone/media: the family's recent inbound images and PDFs (metadata only). */
export function useThreadMedia(phone: string) {
  const path = `${threadPath(phone)}/media`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<ThreadMediaItem[]>(path),
    meta,
  });
}

/**
 * GET /threads/:phone/media/:messageId: the file, signed (the API downloads it from WhatsApp on
 * first ask and caches it). One per card, only for an image that has not expired: the thumbnail.
 */
export function useMediaUrl(phone: string, messageId: string, enabled: boolean) {
  const path = `${threadPath(phone)}/media/${messageId}`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<MediaUrl>(path),
    enabled,
    meta,
    staleTime: 5 * 60_000,
  });
}
