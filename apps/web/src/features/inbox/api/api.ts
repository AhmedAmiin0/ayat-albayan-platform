import type {
  FollowUpNote,
  SignedDownload,
  LeadQualification,
  LeadStatus,
  MessageView,
  ThreadDetail,
  ThreadRating,
  ThreadTemplate,
  ThreadText,
  ThreadView,
} from '@ab/shared';
import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { LeadRow, Page } from '@/features/leads/types';
import { apiFetch, apiSend } from '@/lib/http/api';
import { env } from '@/lib/http/env';
import type { InboxSearch } from '../shared/search';

// Inbox routes (docs/12 §4: H1–H4, M1–M2, L1–L2) plus the existing lead routes.

export const THREADS_PAGE_SIZE = 30;
/** New WhatsApp messages arrive by webhook; the open inbox polls for them (10 s; e2e 1 s). */
export const INBOX_REFRESH_MS = env.inboxRefreshMs;

export const threadsQuery = (s: InboxSearch) => {
  const params = new URLSearchParams({ page: String(s.page), pageSize: String(THREADS_PAGE_SIZE) });
  if (s.q) params.set('search', s.q);
  if (s.unread) params.set('unread', 'true');
  // «غير المقروءة أولًا» = most unread first; names A→ي.
  if (s.sort) params.set('sort', s.sort);
  if (s.sort === 'unread') params.set('dir', 'desc');
  if (s.f_status) params.set('status', s.f_status);
  if (s.list) params.set('list', s.list);
  return queryOptions({
    queryKey: ['threads', 'list', params.toString()],
    queryFn: () => apiFetch<Page<ThreadView>>(`/threads?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: INBOX_REFRESH_MS,
  });
};

/** `+` must not reach the path raw (docs/12 H2: url-encoded E.164). */
const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;

/**
 * One page per `before` (the oldest loaded message), newest page first. Opening stamps read_at, so the
 * open chat polls only while its window has focus: a chat left open in a background window must not
 * mark new messages read for everyone. TanStack's refetchOnWindowFocus follows visibilitychange only,
 * so a click into another (still visible) window stops the poll with no event to restart it:
 * ThreadPane refetches on the window's 'focus' event (useWindowFocus), which re-arms the interval.
 */
export const threadQuery = (phone: string) =>
  infiniteQueryOptions({
    queryKey: ['threads', 'detail', phone],
    queryFn: ({ pageParam }) =>
      apiFetch<ThreadDetail>(pageParam ? `${threadPath(phone)}?before=${encodeURIComponent(pageParam)}` : threadPath(phone)),
    initialPageParam: '',
    getNextPageParam: (last) => (last.has_more ? last.messages[0]?.created_at : undefined),
    refetchInterval: () => (document.hasFocus() ? INBOX_REFRESH_MS : false),
  });

/** A file in a chat bubble as a signed URL of our own copy (ThreadMediaService.file). */
export type ThreadFile = SignedDownload & { mime: string };

/**
 * GET /threads/:phone/messages/:messageId/file: an inbound image or PDF, downloaded from WhatsApp on
 * first use; 410 media_expired when it is gone. Asked only after a click; fresh for half the URL's hour.
 */
export const threadFileQuery = (phone: string, messageId: string) =>
  queryOptions({
    // Not under ['threads']: a send or an opened chat invalidates those, and this would sign it again.
    queryKey: ['thread-file', phone, messageId],
    queryFn: () => apiFetch<ThreadFile>(`${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/file`),
    staleTime: 30 * 60_000,
    retry: false,
  });

/** H3; `replyToMessageId` (owner 2026-10-25): the message of this chat it answers (400 reply_not_in_thread otherwise). */
export const sendText = ({ phone, ...body }: ThreadText & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/text`, body);

export const sendTemplate = ({ phone, ...body }: ThreadTemplate & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/template`, body);

/** «إرسال تقييم الحلقة»: lesson_rating for the guardian's latest lesson that took place (migration 195). */
export const sendRating = ({ phone, ...body }: ThreadRating & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/rating`, body);

/** M1: a failed row goes back to the queue (attempts 0). */
export const retryMessage = (id: string) => apiSend<MessageView>('POST', `/messages/${id}/retry`);

/** M3: the admin opened wa.me; the sender holds the row until they confirm (M2) or put it back (M1). */
export const handOffMessage = (id: string) => apiSend<MessageView>('POST', `/messages/${id}/hand-off`);

/** M2: the admin sent it from WhatsApp by hand (R-MSG-03); the sender never resends it. */
export const markSentManually = (id: string) => apiSend<MessageView>('POST', `/messages/${id}/sent-manually`);

/** GET /leads returns every column; the inbox panel needs these beyond the list row. */
export type InboxLead = LeadRow & {
  qualification: LeadQualification;
  tz: string | null;
  follow_up_paused: boolean;
  follow_up_stage: number;
  next_follow_up_at: string | null;
  /** Why the due follow-up has not gone out (migration 144). */
  follow_up_note: FollowUpNote | null;
  /** «lead» = they sent «وقف»: resuming needs the admin's explicit confirm. */
  follow_up_paused_by: 'lead' | 'admin' | null;
  updated_at: string;
};

/**
 * The thread's lead row. There is no GET /leads/:id: the list's phone search finds it, and the
 * exact E.164 match picks it. TODO(R-LEAD-03): have ThreadDetail carry the lead (B2).
 */
export const leadByPhoneQuery = (phone: string) =>
  queryOptions({
    queryKey: ['leads', 'by-phone', phone],
    queryFn: async () => {
      const params = new URLSearchParams({ q: phone, page: '1', pageSize: '5' });
      const page = await apiFetch<Page<InboxLead>>(`/leads?${params}`);
      return page.items.find((l) => l.phone_e164 === phone) ?? null;
    },
  });

export const patchQualification = (input: { id: string; patch: Partial<LeadQualification> }) =>
  apiSend<InboxLead>('PATCH', `/leads/${input.id}/qualification`, input.patch);

export const setFollowUpPaused = (input: { id: string; paused: boolean }) =>
  apiSend<InboxLead>('PATCH', `/leads/${input.id}/follow-up`, { paused: input.paused });

export const changeLeadStatus = (input: { id: string; status: LeadStatus }) =>
  apiSend<InboxLead>('PATCH', `/leads/${input.id}/status`, { status: input.status });
