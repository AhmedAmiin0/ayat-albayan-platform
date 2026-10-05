import type {
  FollowUpNote,
  LeadQualification,
  LeadStatus,
  MessageView,
  ThreadDetail,
  ThreadRating,
  ThreadTemplate,
  ThreadView,
} from '@ab/shared';
import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { LeadRow, Page } from '@/features/leads/types';
import { apiFetch, apiSend } from '@/lib/api';
import { env } from '@/lib/env';
import type { InboxSearch } from './search';

// Inbox routes (docs/12 §4: H1–H4, M1–M2, L1–L2) plus the existing lead routes.

export const THREADS_PAGE_SIZE = 30;
/** New WhatsApp messages arrive by webhook; the open inbox polls for them (10 s; e2e 1 s). */
export const INBOX_REFRESH_MS = env.inboxRefreshMs;

export const threadsQuery = (s: InboxSearch) => {
  const params = new URLSearchParams({ page: String(s.page), pageSize: String(THREADS_PAGE_SIZE) });
  if (s.q) params.set('search', s.q);
  if (s.unread) params.set('unread', 'true');
  return queryOptions({
    queryKey: ['threads', 'list', params.toString()],
    queryFn: () => apiFetch<Page<ThreadView>>(`/threads?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: INBOX_REFRESH_MS,
  });
};

/** `+` must not reach the path raw (docs/12 H2: url-encoded E.164). */
const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;

/** One page per `before` (the oldest loaded message), newest page first. Opening stamps read_at. */
export const threadQuery = (phone: string) =>
  infiniteQueryOptions({
    queryKey: ['threads', 'detail', phone],
    queryFn: ({ pageParam }) =>
      apiFetch<ThreadDetail>(pageParam ? `${threadPath(phone)}?before=${encodeURIComponent(pageParam)}` : threadPath(phone)),
    initialPageParam: '',
    getNextPageParam: (last) => (last.has_more ? last.messages[0]?.created_at : undefined),
    refetchInterval: INBOX_REFRESH_MS,
  });

export const sendText = (input: { phone: string; text: string; clientRequestId: string }) =>
  apiSend<MessageView>('POST', `${threadPath(input.phone)}/text`, {
    text: input.text,
    clientRequestId: input.clientRequestId,
  });

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
