import { useQuery } from '@tanstack/react-query';
import { chatFileCalls } from '@ab/client-core';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { threadPath } from '@/inbox/thread/hooks/thread-cache';

// Admin-only (a teacher gets 403). Signed URLs expire, so `noPersist` keeps these off the disk
// cache (lib/query-client): a restart would show a dead thumbnail.
const meta = { noPersist: true };
const chatFiles = chatFileCalls({ apiFetch, apiSend });

/** GET /threads/:phone/media: the family's recent inbound images and PDFs (metadata only). */
export function useThreadMedia(phone: string) {
  const path = `${threadPath(phone)}/media`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => chatFiles.media({ phone }),
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
    queryFn: () => chatFiles.mediaFile({ phone, messageId }),
    enabled,
    meta,
    staleTime: 5 * 60_000,
  });
}
