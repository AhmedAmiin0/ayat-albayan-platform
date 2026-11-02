import {
  courseActionsKey,
  courseMoveBase,
  courseMoveViewPath,
  courseStopPath,
  courseStopPreviewPath,
  courseTeacherOptionsPath,
  type CourseMoveKind,
} from '@ab/client-core';
import type {
  BookingTeacherOption,
  CourseStopPreview,
  CourseStopRequest,
  CourseStopResult,
  ProfileCourseView,
} from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

// The student profile's «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» (owner
// 2026-10-30): the same routes in the admin and the sales trees (their own keys); paths and key
// are @ab/client-core's, shared with web.

export interface SubRef {
  studentId: string;
  subscriptionId: string;
}

interface Keys {
  stop: boolean;
  teacher: boolean;
  times: boolean;
}

/** The first GET the viewer may call without subscriptionId (the server's current package). */
function currentPath(studentId: string, keys: Keys): string | null {
  if (keys.stop) return courseStopPath(studentId);
  if (keys.times) return `${courseMoveBase({ studentId, kind: 'times' })}/change`;
  if (keys.teacher) return `${courseMoveBase({ studentId, kind: 'teacher' })}/change`;
  return null;
}

const idOf = (data: CourseStopPreview | ProfileCourseView): string =>
  'course' in data ? data.course.subscriptionId : data.subscriptionId;

/**
 * The package the actions are about: the one the screen passes, else the student's current one
 * as the first allowed GET answers it. null = none yet, or none (404 subscription_not_found).
 */
export function useCurrentSubscription(input: {
  studentId: string;
  given: string | null | undefined;
  keys: Keys;
}): string | null {
  const path = input.given ? null : currentPath(input.studentId, input.keys);
  const current = useQuery({
    queryKey: [...courseActionsKey(input.studentId), 'current', path],
    queryFn: () => apiFetch<CourseStopPreview | ProfileCourseView>(path ?? ''),
    enabled: path !== null,
  });
  if (input.given) return input.given;
  return current.data ? idOf(current.data) : null;
}

/** GET …/course-stop?subscriptionId=: the stop sheet's lines. */
export const useStopPreview = (sub: SubRef) =>
  useQuery({
    queryKey: [...courseActionsKey(sub.studentId), 'stop', sub.subscriptionId],
    queryFn: () => apiFetch<CourseStopPreview>(courseStopPreviewPath(sub)),
  });

/** GET …/course-teacher|course-times/change?subscriptionId=: the course and its next lesson. */
export const useMoveView = (sub: SubRef & { kind: CourseMoveKind }) =>
  useQuery({
    queryKey: [...courseActionsKey(sub.studentId), sub.kind, sub.subscriptionId],
    queryFn: () => apiFetch<ProfileCourseView>(courseMoveViewPath(sub)),
  });

/** GET …/course-teacher/teachers: the student's program and gender preference. */
export const useTeacherOptions = (studentId: string) =>
  useQuery({
    queryKey: [...courseActionsKey(studentId), 'teachers'],
    queryFn: () => apiFetch<BookingTeacherOption[]>(courseTeacherOptionsPath(studentId)),
  });

/** After a stop: the actions, the student's file and lists («توقف»), sales' screens, lessons. */
function useRefresh(studentId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: courseActionsKey(studentId) }),
      client.invalidateQueries({ queryKey: pathKey('/students') }),
      client.invalidateQueries({ queryKey: pathKey('/sales') }),
      client.invalidateQueries({ queryKey: pathKey('/lessons') }),
    ]);
}

/** POST …/course-stop { subscriptionId, reason, clientRequestId }: one id per sheet (rule 8). */
export function useStopCourse(studentId: string) {
  const refresh = useRefresh(studentId);
  return useMutation({
    mutationFn: (body: CourseStopRequest) =>
      apiSend<CourseStopResult>('POST', courseStopPath(studentId), body),
    onSuccess: refresh,
  });
}
