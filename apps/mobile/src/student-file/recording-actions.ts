import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { recordingsKey } from './recordings-queries';

const R = t.mobileStudentFile.recordings;

const codeOf = (e: unknown): string | undefined =>
  e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? String(Reflect.get(e.body, 'code') ?? '') : undefined;

/** The line under the toggle: a group lesson's file cannot be shown to one student (409), else a generic failure. */
export const visibilityError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 && codeOf(e) === 'recording_group_lesson' ? R.visible.groupLesson : R.visible.failed;

/** 409 while the recording is still running; anything else is a plain failure. */
export const deleteError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? R.delete.inProgress : R.delete.failed;

/** PATCH /recordings/:id/visibility (admin, or the lesson's teacher). */
export function useSetVisibility(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; visible: boolean }) =>
      apiSend('PATCH', `/recordings/${input.id}/visibility`, { visible: input.visible }),
    onSuccess: () => client.invalidateQueries({ queryKey: recordingsKey(studentId) }),
  });
}

/** DELETE /recordings/:id (admin only; 409 while recording). The row stays as «محذوف». */
export function useDeleteRecording(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend('DELETE', `/recordings/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: recordingsKey(studentId) }),
  });
}
