import {
  courseActionsKey,
  courseKeys,
  courseMoveBase,
  courseMoveViewPath,
  courseStopCalls,
  courseStopPath,
  courseTeacherOptionsPath,
  type CourseMoveKind,
} from '@ab/client-core';
import type { CourseStopPreview, CourseStopRequest, ProfileCourseView } from '@ab/shared';
import type { BookingTeacherOption } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

// The same routes in the admin and sales trees, each with its own key; shared with web.

const stops = courseStopCalls({ apiFetch, apiSend });

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

/** The current package: its id, null = none (404, or no key to ask), undefined = not known yet. */
type CurrentPackage = string | null | undefined;

/** A 404 (subscription_not_found) answers «no package»; any other failure leaves it unknown. */
const noPackage = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

/**
 * The package the actions are about: the one the screen passes, else the student's current one
 * as the first allowed GET answers it. `id` is undefined while loading or after a failure (never
 * «no package»); `settle` asks again and answers the same three ways.
 */
export function useCurrentPackage(input: {
  studentId: string;
  given: string | null | undefined;
  keys: Keys;
}) {
  const path = input.given ? null : currentPath(input.studentId, input.keys);
  const current = useQuery({
    queryKey: courseKeys.current(input.studentId, path),
    queryFn: () => apiFetch<CourseStopPreview | ProfileCourseView>(path ?? ''),
    enabled: path !== null,
  });
  const idOfAnswer = (data: typeof current.data, error: unknown): CurrentPackage => {
    if (input.given || path === null) return input.given ?? null;
    if (data) return idOf(data);
    return noPackage(error) ? null : undefined;
  };
  const settle = async (): Promise<CurrentPackage> => {
    if (path === null) return idOfAnswer(undefined, null);
    const answer = await current.refetch();
    return idOfAnswer(answer.data, answer.error);
  };
  return { id: idOfAnswer(current.data, current.error), settle };
}

/** The package's id; null = none yet, or none (see useCurrentPackage). */
export function useCurrentSubscription(
  input: Parameters<typeof useCurrentPackage>[0],
): string | null {
  return useCurrentPackage(input).id ?? null;
}

/**
 * A stop cancels the package, so the re-read finds none: while `keep` (its sheet is open) the last
 * package seen stays, and the sheet can say what it did.
 */
export function useHeldPackage(current: string | null, keep: boolean): string | null {
  const [held, setHeld] = useState<string | null>(null);
  if (current && current !== held) setHeld(current);
  return current ?? (keep ? held : null);
}

/** GET …/course-stop?subscriptionId=: the stop sheet's lines. */
export const useStopPreview = (sub: SubRef) =>
  useQuery({
    queryKey: courseKeys.stopPreview(sub),
    queryFn: () => stops.preview(sub),
  });

/** GET …/course-teacher|course-times/change?subscriptionId=: the course and its next lesson. */
export const useMoveView = (sub: SubRef & { kind: CourseMoveKind }) =>
  useQuery({
    queryKey: courseKeys.move(sub, sub.kind),
    queryFn: () => apiFetch<ProfileCourseView>(courseMoveViewPath(sub)),
  });

/** GET …/course-teacher/teachers: the student's program and gender preference. */
export const useTeacherOptions = (studentId: string) =>
  useQuery({
    queryKey: courseKeys.teachers(studentId),
    queryFn: () => apiFetch<BookingTeacherOption[]>(courseTeacherOptionsPath(studentId)),
  });

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
    mutationFn: (body: CourseStopRequest) => stops.stop(studentId, body),
    onSuccess: refresh,
  });
}
