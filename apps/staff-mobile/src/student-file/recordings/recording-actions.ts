import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, t } from '@ab/mobile-kit';
import { recordingsApi, recordingsKey } from './recordings-queries';

const R = t.mobileStudentFile.recordings;

const codeOf = (e: unknown): string | undefined =>
  e instanceof ApiError && typeof e.body === 'object' && e.body !== null ? String(Reflect.get(e.body, 'code') ?? '') : undefined;

/** The line under the toggle: a group lesson's file cannot be shown to one student (409), else a generic failure. */
export const visibilityError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 && codeOf(e) === 'recording_group_lesson' ? R.visible.groupLesson : R.visible.failed;

/** 409 while the recording is still running; anything else is a plain failure. */
export const deleteError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? R.delete.inProgress : R.delete.failed;

/** Admin, or the lesson's teacher. */
export function useSetVisibility(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.setVisible,
    onSuccess: () => client.invalidateQueries({ queryKey: recordingsKey(studentId) }),
  });
}

/** Admin only; 409 while recording; the row stays as deleted. */
export function useDeleteRecording(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: recordingsKey(studentId) }),
  });
}
