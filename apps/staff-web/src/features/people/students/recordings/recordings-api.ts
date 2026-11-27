import { studentRecordingsApi } from '@ab/client-core';
import type { StudentRecordingFilters } from '@ab/schedule';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { recordingKeys } from '@/features/people/keys';

export const RECORDINGS_KEY = recordingKeys.all;

export const RECORDINGS_PAGE_SIZE = 10;

const recordings = studentRecordingsApi({ apiFetch, apiSend });

/** Admin, the teacher, an assigned assistant: newest first. */
export const studentRecordingsQuery = (input: {
  studentId: string;
  filters: StudentRecordingFilters;
  page: number;
  pageSize?: number;
}) => {
  const pageSize = input.pageSize ?? RECORDINGS_PAGE_SIZE;
  const query = { page: input.page, pageSize, ...input.filters };
  return queryOptions({
    queryKey: recordingKeys.page({ ...input, pageSize }),
    queryFn: () => recordings.list({ studentId: input.studentId, query }),
    placeholderData: keepPreviousData,
    // The signed links last an hour; refetch before they could run out under an open page.
    staleTime: 30 * 60_000,
  });
};

/** The lessons with a finished recording (no signed links). */
export const recordedLessonIdsQuery = (studentId: string) =>
  queryOptions({
    queryKey: recordingKeys.recordedLessonIds(studentId),
    queryFn: () => recordings.recordedLessonIds(studentId),
    staleTime: 5 * 60_000,
  });

/** Admin, or the lesson's teacher. */
export const setRecordingVisible = recordings.setVisible;

/** Admin only; answers 204. */
export const deleteRecording = recordings.remove;
