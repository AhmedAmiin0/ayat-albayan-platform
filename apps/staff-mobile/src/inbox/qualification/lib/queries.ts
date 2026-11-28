import type {
  FollowUpNote,
  LeadFollowUp,
  LeadQualificationPatch,
  LeadRowView,
  LeadView,
} from '@ab/shared';
import { leadWriteCalls } from '@ab/client-core';
import type { Page } from '@ab/core';
import { settingsCalls } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey, t } from '@ab/mobile-kit';
import { patchCached } from '@/core/lib/query/paging';
import { isOffline } from '@/core/lib/money/payment-errors';
import { leadKeys } from '@/core/lib/keys';

/**
 * GET /leads returns every column (apps/api LeadRow); the profile reads these beyond the list row.
 * Optional: a list cached by an older build may not carry them.
 */
export type LeadProfile = LeadView & {
  /** jsonb, any shape: qualForm() reads it. */
  qualification?: unknown;
  follow_up_paused?: boolean;
  /** Lead means they opted out: resuming needs the admin's explicit confirm. */
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
    queryKey: leadKeys.byPhone(phone),
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

interface LeadPatchInput<B> {
  id: string;
  body: B;
}

const leadWrites = leadWriteCalls({ apiFetch, apiSend });

/** L1: only the changed fields; the API merges them and a null clears one. */
export const saveQualification = ({ id, body }: LeadPatchInput<LeadQualificationPatch>) =>
  leadWrites.qualification({ id, patch: body });

/** L2: the admin's pause of this lead's follow-ups. */
export const savePause = ({ id, body }: LeadPatchInput<LeadFollowUp>) =>
  leadWrites.followUp({ id, paused: body.paused });

/**
 * L1 or L2. Both answer the whole row: it replaces the lead in every cached list and detail, so
 * the inbox and this screen agree without a refetch.
 */
export function useLeadPatch<B>(send: (input: LeadPatchInput<B>) => Promise<LeadRowView>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (row) => {
      client.setQueriesData({ queryKey: pathKey('/leads') }, (old: unknown) =>
        patchCached(old, { ...row }),
      );
    },
  });
}

/** A failed save in words: no answer at all is the offline line, anything else the generic one. */
export function saveErrorText(error: unknown): string {
  return isOffline(error) ? t.leads.mobile.offline : t.common.error;
}

const settings = settingsCalls({ apiFetch, apiSend });

/** How many follow-ups the settings send; undefined until a valid /settings answer loads. */
export function useFollowUpTotal(): number | undefined {
  const { data } = useQuery({
    queryKey: pathKey('/settings'),
    queryFn: () => settings.view(),
    staleTime: 60 * 60 * 1000,
  });
  return data?.follow_up_hours.length;
}
