import type { StudentRecordingsPage } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

export const RECORDINGS_KEY = ['student-recordings'] as const;

/** The list's filters: lesson day range (yyyy-mm-dd) and teacher; empty = no filter. */
export interface RecordingFilters {
  from?: string | undefined;
  to?: string | undefined;
  teacherId?: string | undefined;
}

export const RECORDINGS_PAGE_SIZE = 10;

function queryString(filters: RecordingFilters, page: number, pageSize: number): string {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  for (const key of ['from', 'to', 'teacherId'] as const) if (filters[key]) q.set(key, filters[key]);
  return q.toString();
}

/** GET /students/:id/recordings (admin, the teacher, an assigned assistant): newest first. */
export const studentRecordingsQuery = (input: { studentId: string; filters: RecordingFilters; page: number; pageSize?: number }) =>
  queryOptions({
    queryKey: [...RECORDINGS_KEY, input.studentId, input.filters, input.page, input.pageSize ?? RECORDINGS_PAGE_SIZE],
    queryFn: () =>
      apiFetch<StudentRecordingsPage>(
        `/students/${input.studentId}/recordings?${queryString(input.filters, input.page, input.pageSize ?? RECORDINGS_PAGE_SIZE)}`,
      ),
    placeholderData: keepPreviousData,
    // The signed links last an hour; refetch before they could run out under an open page.
    staleTime: 30 * 60_000,
  });

/** GET /students/:id/recorded-lesson-ids: the lessons with a finished recording (no signed links). */
export const recordedLessonIdsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...RECORDINGS_KEY, studentId, 'recorded-lesson-ids'],
    queryFn: () => apiFetch<string[]>(`/students/${studentId}/recorded-lesson-ids`),
    staleTime: 5 * 60_000,
  });

/** PATCH /recordings/:id/visibility: admin, or the lesson's teacher. */
export const setRecordingVisible = (input: { id: string; visible: boolean }) =>
  apiSend<{ id: string; visible_to_student: boolean }>('PATCH', `/recordings/${input.id}/visibility`, { visible: input.visible });

/** DELETE /recordings/:id (204): admin only. */
export const deleteRecording = (id: string) => apiSend('DELETE', `/recordings/${id}`);
