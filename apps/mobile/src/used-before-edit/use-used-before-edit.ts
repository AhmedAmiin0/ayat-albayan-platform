import { usedBeforeEditMax } from '@ab/shared';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

/** The package as both cards hold it: lessons_used counts lessons_used_before in. */
export interface EditablePackage {
  id: string;
  status: string;
  lessons_total: number;
  lessons_used: number;
  lessons_used_before?: number | undefined;
}

/** The stepper's last value (usedBeforeEditMax: the create's bound, never past free lessons). */
export const editMax = (sub: EditablePackage): number =>
  usedBeforeEditMax({
    lessonsTotal: sub.lessons_total,
    platformUsed: sub.lessons_used - (sub.lessons_used_before ?? 0),
  });

const errorBody = z.object({ code: z.string() });
const MESSAGES: Record<string, string | undefined> = t.salesMoney.usedBeforeEdit.errors;

/** The API's refusal in the user's words (course booked, too many…), else the generic line. */
export function editErrorText(error: unknown): string {
  const parsed = error instanceof ApiError ? errorBody.safeParse(error.body) : null;
  const code = parsed?.success === true ? parsed.data.code : '';
  return MESSAGES[code] ?? t.salesMoney.usedBeforeEdit.errors.generic;
}

/**
 * PATCH /subscriptions/:id/lessons-used-before { lessonsUsedBefore } (owner 2026-11-02), then the
 * screens holding the package (`stale`) refetch.
 */
export function useUsedBeforeEdit(id: string, stale: readonly QueryKey[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (lessonsUsedBefore: number) =>
      apiSend('PATCH', `/subscriptions/${id}/lessons-used-before`, {
        lessonsUsedBefore,
      }),
    onSuccess: () => Promise.all(stale.map((queryKey) => client.invalidateQueries({ queryKey }))),
  });
}
