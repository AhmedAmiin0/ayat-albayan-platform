import {
  normaliseTemplateParams,
  type FollowUpNote,
  type LeadQualification,
  type MessageView,
  type ThreadDetail,
  type ThreadRating,
  type ThreadTemplate,
  type ThreadText,
  type ThreadFile,
  type ThreadView,
} from '@ab/shared';
import type { LeadStatus } from '@ab/catalog';
import { liveInterval, offPathKeys, type TextAnswer } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { env } from '@ab/web-kit/lib/http/env';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { inboxLive } from './live';
import type { LeadView } from '@ab/shared';
import type { Page } from '@ab/core';
import { inboxLeadKeys, threadKeys } from '@/features/messaging/inbox/api/keys';

// Inbox routes (docs/12 §4: H1–H4, M1–M2, L1–L2) plus the existing lead routes.

export const THREADS_PAGE_SIZE = 30;
/** New WhatsApp messages arrive by webhook; the open chat polls for them with a delta (10 s; e2e 1 s). */
export const INBOX_REFRESH_MS = env.inboxRefreshMs;
/** The inbox's poll: INBOX_FALLBACK_MS while realtime is connected (its events re-read sooner), else the above. */
export const inboxPollMs = () => liveInterval(inboxLive.isLive(), INBOX_REFRESH_MS);

export const threadsQuery = (s: InboxSearch) => {
  const params = new URLSearchParams({ page: String(s.page), pageSize: String(THREADS_PAGE_SIZE) });
  if (s.q) params.set('search', s.q);
  if (s.unread) params.set('unread', 'true');
  if (s.sort) params.set('sort', s.sort);
  if (s.sort === 'unread') params.set('dir', 'desc');
  if (s.f_status) params.set('status', s.f_status);
  if (s.list) params.set('list', s.list);
  return queryOptions({
    queryKey: threadKeys.list(params.toString()),
    queryFn: ({ signal }) => apiFetch<Page<ThreadView>>(`/threads?${params}`, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: () => liveInterval(inboxLive.isLive(), env.inboxListRefreshMs),
  });
};

/** `+` must not reach the path raw (docs/12 H2: url-encoded E.164). */
export const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;

/** One page of a chat (live or anchored, docs/37): GET /threads/:phone with its page's query. */
export const threadPage = (path: string, init?: RequestInit) => apiFetch<ThreadDetail>(path, init);

/** A file in a chat bubble as a signed URL of our own copy (ThreadMediaService.file). */
/**
 * GET /threads/:phone/messages/:messageId/file: an inbound image or PDF, downloaded from WhatsApp on
 * first use; 410 media_expired when it is gone. Asked only after a click; fresh for half the URL's hour.
 */
export const threadFileQuery = (phone: string, messageId: string) =>
  queryOptions({
    queryKey: offPathKeys.threadFile(phone, messageId),
    queryFn: () =>
      apiFetch<ThreadFile>(`${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/file`),
    staleTime: 30 * 60_000,
    retry: false,
  });

/** Never cached: each click gets a fresh URL signed to save under the file's name. */
export const threadFileDownload = (phone: string, messageId: string) =>
  apiFetch<ThreadFile>(
    `${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/file?download=1`,
  );

/** H3; `replyToMessageId`: the message of this chat it answers (else 400 reply_not_in_thread). */
/** The row, and whether its request id replayed the FIRST one (TextAnswer). */
export const sendText = ({ phone, ...body }: ThreadText & { phone: string }) =>
  apiSend<TextAnswer>('POST', `${threadPath(phone)}/text`, body);

/** Meta 132018: every body value normalised (free-text.ts) before it goes. */
export const sendTemplate = ({ phone, params, ...body }: ThreadTemplate & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/template`, {
    ...body,
    params: normaliseTemplateParams(params),
  });

/** Rates the guardian's latest lesson that took place (migration 195). */
export const sendRating = ({ phone, ...body }: ThreadRating & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/rating`, body);

/** M1: a failed row goes back to the queue (attempts 0). */
export const retryMessage = (id: string) => apiSend<MessageView>('POST', `/messages/${id}/retry`);

/** M3: the admin opened wa.me; the sender holds the row until they confirm (M2) or put it back (M1). */
export const handOffMessage = (id: string) =>
  apiSend<MessageView>('POST', `/messages/${id}/hand-off`);

/** M2: the admin sent it from WhatsApp by hand (R-MSG-03); the sender never resends it. */
export const markSentManually = (id: string) =>
  apiSend<MessageView>('POST', `/messages/${id}/sent-manually`);

/** GET /leads returns every column; the inbox panel needs these beyond the list row. */
export type InboxLead = LeadView & {
  qualification: LeadQualification;
  tz: string | null;
  follow_up_paused: boolean;
  follow_up_stage: number;
  next_follow_up_at: string | null;
  /** Why the due follow-up has not gone out (migration 144). */
  follow_up_note: FollowUpNote | null;
  /** "lead" means they opted out by message, so resuming needs the admin's explicit confirm. */
  follow_up_paused_by: 'lead' | 'admin' | null;
  updated_at: string;
};

/**
 * The thread's lead row. There is no GET /leads/:id: the list's phone search finds it, and the
 * exact E.164 match picks it. TODO(R-LEAD-03): have ThreadDetail carry the lead (B2).
 */
export const leadByPhoneQuery = (phone: string) =>
  queryOptions({
    queryKey: inboxLeadKeys.byPhone(phone),
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
