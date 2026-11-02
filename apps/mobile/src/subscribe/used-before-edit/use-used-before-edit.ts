import { riyadhToday, usedBeforeEditOffered, usedBeforeStateSchema } from '@ab/shared';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { t } from '@/core/lib/i18n/i18n';

/** The package as both cards hold it (the stepper's bounds come from the server's state). */
export interface EditablePackage {
  id: string;
  status: string;
  lessons_used_before?: number | undefined;
  /** YYYY-MM-DD: a count > 0 only with a start before today (the create's rule). */
  starts_on: string;
}

const pastStart = (sub: EditablePackage): boolean => sub.starts_on < riyadhToday();

/** Not cancelled, and something to change (usedBeforeEditOffered). */
export const editOffered = (sub: EditablePackage): boolean =>
  usedBeforeEditOffered({
    cancelled: sub.status === 'cancelled',
    pastStart: pastStart(sub),
    current: sub.lessons_used_before ?? 0,
  });

const errorBody = z.object({ code: z.string() });
const MESSAGES: Record<string, string | undefined> = t.salesMoney.usedBeforeEdit.errors;

/** The API's refusal in the user's words (course booked, too many…), else the generic line. */
export function editErrorText(error: unknown): string {
  const parsed = error instanceof ApiError ? errorBody.safeParse(error.body) : null;
  const code = parsed?.success === true ? parsed.data.code : '';
  return MESSAGES[code] ?? t.salesMoney.usedBeforeEdit.errors.generic;
}

const statePath = (id: string): string => `/subscriptions/${id}/lessons-used-before`;

/** GET …/lessons-used-before: the stored number, the stepper's last value, why it is refused. */
export function useUsedBeforeState(id: string) {
  return useQuery({
    queryKey: pathKey(statePath(id)),
    queryFn: async () => usedBeforeStateSchema.parse(await apiFetch(statePath(id))),
  });
}

const changedElsewhere = (error: unknown): boolean =>
  error instanceof ApiError && errorBody.safeParse(error.body).data?.code === 'used_before_changed';

/**
 * PATCH /subscriptions/:id/lessons-used-before { lessonsUsedBefore } (owner 2026-11-02), then the
 * screens holding the package (`stale`) and the editor's state refetch; a number changed elsewhere
 * (409 used_before_changed) refetches the state too.
 */
export function useUsedBeforeEdit(id: string, stale: readonly QueryKey[]) {
  const client = useQueryClient();
  const refresh = (keys: readonly QueryKey[]) =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  const state = pathKey(statePath(id));
  return useMutation({
    mutationFn: (lessonsUsedBefore: number) =>
      apiSend('PATCH', statePath(id), { lessonsUsedBefore }),
    onSuccess: () => refresh([...stale, state]),
    onError: (error) => (changedElsewhere(error) ? refresh([state]) : undefined),
  });
}
