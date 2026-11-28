import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { startDateEditCall } from '@ab/client-core';
import { ApiError, apiFetch, apiSend, t } from '@ab/mobile-kit';

/** The package as both cards hold it. */
export interface StartDatePackage {
  id: string;
  status: string;
  /** YYYY-MM-DD. */
  starts_on: string;
  lessons_used_before?: number | undefined;
}

const errorBody = z.object({ code: z.string() });
const MESSAGES: Record<string, string | undefined> = t.salesMoney.startDateEdit.errors;

/** The API's refusal in the user's words (cancelled, too old…), else the generic line. */
export function startDateErrorText(error: unknown): string {
  const parsed = error instanceof ApiError ? errorBody.safeParse(error.body) : null;
  const code = parsed?.success === true ? parsed.data.code : '';
  return MESSAGES[code] ?? t.salesMoney.startDateEdit.errors.generic;
}

const editStartDate = startDateEditCall({ apiFetch, apiSend });

/**
 * PATCH /subscriptions/:id/start-date { startsOn }, then the screens holding
 * the package (`stale`) refetch.
 */
export function useStartDateEdit(id: string, stale: readonly QueryKey[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (startsOn: string) => editStartDate(id, startsOn),
    onSuccess: async () => {
      await Promise.all(stale.map((queryKey) => client.invalidateQueries({ queryKey })));
    },
  });
}
