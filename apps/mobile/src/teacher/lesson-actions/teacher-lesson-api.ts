import type { TeacherCancelRequest } from '@ab/shared';
import { cancelAnswerSchema, confirmAnswerSchema, teacherLessonPaths } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { isNetworkError } from '@/core/lib/connectivity/network-error';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { patchCached, type Patch } from '@/core/lib/query/paging';
import { pathKey } from '@/core/lib/query/query-keys';

// docs/46 C3/C4: the teacher's own lesson routes (self.teacher), never the admin's /lessons/:id/*.

const errorBody = z.object({ code: z.string() });

/** A refused action in words: 409 lesson_started, no answer at all, else the general line. */
const ERROR_TEXT: Record<string, string | undefined> = {
  lesson_started: t.teacherBoard.lessonStarted,
  network: t.teacherBoard.offline,
};

const apiCode = (error: unknown): string | undefined => {
  const body = error instanceof ApiError ? errorBody.safeParse(error.body) : null;
  return body?.success ? body.data.code : undefined;
};

/** docs/48: no answer at all (offline) has its own line. */
const codeOf = (error: unknown) => (isNetworkError(error) ? 'network' : apiCode(error));

export function teacherActionError(error: unknown): string {
  return ERROR_TEXT[codeOf(error) ?? ''] ?? t.teacherBoard.actionFailed;
}

/** apiSend with its reply left unknown, for the schema to parse. */
const post: (method: 'POST', path: string, body?: TeacherCancelRequest) => Promise<unknown> =
  apiSend;

/** «اليوم», «جدولي» and the board read GET /teachers/me/lessons under ['lessons']: refetch them. */
function useRefreshLessons() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: pathKey('/lessons') });
}

/** Her own lists only (docs/48): other keys under ['lessons'] are not patched. */
const MINE: QueryKey = [...pathKey('/lessons'), 'mine'];
type Snapshot = readonly (readonly [QueryKey, unknown])[];

/** Puts `patch` on the row in every cached list of hers; returns what was there before. */
function patchMine(client: QueryClient, patch: Patch): Snapshot {
  const before = client.getQueriesData({ queryKey: MINE });
  client.setQueriesData({ queryKey: MINE }, (data: unknown) => patchCached(data, patch));
  return before;
}

function restoreMine(client: QueryClient, snapshot: Snapshot | undefined) {
  for (const [key, data] of snapshot ?? []) client.setQueryData(key, data);
}

/**
 * POST /teachers/me/lessons/:id/confirm-attendance: «سأحضر» (D1), the status never changes.
 * Optimistic (docs/48): her rows say «حضورك مؤكَّد» at once; a refusal puts them back.
 */
export function useTeacherConfirm(lessonId: string) {
  const client = useQueryClient();
  const refresh = useRefreshLessons();
  return useMutation({
    // The answer bridges the chip until the refetch brings the lesson (confirmedNow).
    mutationFn: async () =>
      confirmAnswerSchema.safeParse(await post('POST', teacherLessonPaths.confirm(lessonId))).data,
    onMutate: async () => {
      await client.cancelQueries({ queryKey: MINE });
      return patchMine(client, { id: lessonId, teacher_confirmed_at: new Date().toISOString() });
    },
    onError: (_error, _vars, snapshot) => restoreMine(client, snapshot),
    // A 409 refetches too, so a stale button goes.
    onSettled: refresh,
  });
}

/**
 * POST /teachers/me/lessons/:id/cancel {reason}: this lesson only, before it starts (D3).
 * Write-through (docs/48): the answer closes the row before the refetch, a refusal never flashes,
 * and /teachers/me re-reads (her students' next lesson).
 */
export function useTeacherCancel(lessonId: string) {
  const client = useQueryClient();
  const refresh = useRefreshLessons();
  return useMutation({
    mutationFn: async (body: TeacherCancelRequest) =>
      cancelAnswerSchema.safeParse(await post('POST', teacherLessonPaths.cancel(lessonId), body))
        .data,
    onSuccess: (answer) => answer && patchMine(client, answer),
    onSettled: () =>
      Promise.all([refresh(), client.invalidateQueries({ queryKey: pathKey('/teachers/me') })]),
  });
}
