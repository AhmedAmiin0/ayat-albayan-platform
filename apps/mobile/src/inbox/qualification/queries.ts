import type { AcademySettings, FollowUpNote } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/core/lib/http/api';
import { patchCached, type Page } from '@/core/lib/query/paging';
import { pathKey } from '@/core/lib/query/query-keys';
import { isOffline } from '@/payments/lib/payment-errors';
import { t } from '@/core/lib/i18n/i18n';
import type { Lead } from '../shared/types';

/**
 * GET /leads returns every column (apps/api LeadRow); the profile reads these beyond the list row.
 * Optional: a list cached by an older build may not carry them.
 */
export type LeadProfile = Lead & {
  /** jsonb, any shape: qualForm() reads it. */
  qualification?: unknown;
  follow_up_paused?: boolean;
  /** «lead» = they sent «وقف»: resuming needs the admin's explicit confirm. */
  follow_up_paused_by?: 'lead' | 'admin' | null;
  follow_up_stage?: number;
  next_follow_up_at?: string | null;
  /** Why the due follow-up has not gone out (migration 144). */
  follow_up_note?: FollowUpNote | null;
};

/**
 * This lead fresh from the API, like the web's leadByPhoneQuery (there is no GET /leads/:id): the
 * phone search, then the exact E.164 match; null if it is no longer a lead. Its failure with no
 * answer at all is how the screen knows it is offline (the app has no NetInfo).
 */
export function useFreshLead(phone: string) {
  return useQuery({
    queryKey: [...pathKey('/leads'), 'by-phone', phone],
    queryFn: async () => {
      const query = toQueryString({ q: phone, page: 1, pageSize: 5 });
      const page = await apiFetch<Page<LeadProfile>>(`/leads${query}`);
      return page.items.find((l) => l.phone_e164 === phone) ?? null;
    },
  });
}

/** Offline while the latest try (or the last finished read) got no answer from the network. */
export function readIsOffline(query: { failureReason: unknown; error: unknown }): boolean {
  return isOffline(query.failureReason ?? query.error);
}

export interface LeadPatchInput<B> {
  id: string;
  body: B;
}

/**
 * PATCH /leads/:id/qualification (L1) or /follow-up (L2). Both answer the whole row: it replaces
 * the lead in every cached list and detail, so the inbox and this screen agree without a refetch.
 */
export function useLeadPatch<B>(route: 'qualification' | 'follow-up') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: LeadPatchInput<B>) =>
      apiSend<LeadProfile>('PATCH', `/leads/${id}/${route}`, body),
    onSuccess: (row) => {
      client.setQueriesData({ queryKey: pathKey('/leads') }, (old: unknown) => patchCached(old, { ...row }));
    },
  });
}

/** A failed save in words: no answer at all is the offline line, anything else the generic one. */
export function saveErrorText(error: unknown): string {
  return isOffline(error) ? t.leads.mobile.offline : t.common.error;
}

/** How many follow-ups the settings send (follow_up_hours); undefined until /settings loads. */
export function useFollowUpTotal(): number | undefined {
  const { data } = useQuery({
    queryKey: pathKey('/settings'),
    queryFn: () => apiFetch<AcademySettings>('/settings'),
    staleTime: 60 * 60 * 1000,
  });
  return data?.follow_up_hours.length;
}
