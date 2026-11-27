import {
  courseActionsKey,
  courseKeys,
  courseStopBody,
  stopDoneLines,
  type StopDone,
  courseMoveBase,
  courseMoveErrorCode,
  courseMoveViewPath,
  courseStopCalls,
  courseTeacherOptionsPath,
  type CourseMoveKind,
  type StopMoneyAsk,
} from '@ab/client-core';
import type { CourseStopRequest, CourseStopResult, ProfileCourseView } from '@ab/shared';
import type { BookingTeacherOption } from '@ab/schedule';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { moneyText } from '@/features/finance/subscriptions';
import { t, apiFetch, apiSend } from '@ab/web-kit';
import { useState } from 'react';

// The student profile's course actions: apps/api course-stop and
// booking/profile. Paths and the key come from @ab/client-core (the same as mobile).

interface Course {
  studentId: string;
  subscriptionId: string;
}

const stops = courseStopCalls({ apiFetch, apiSend });

export const courseStopPreviewQuery = (input: Course) =>
  queryOptions({
    queryKey: courseKeys.stopPreview(input),
    queryFn: () => stops.preview(input),
  });

export const stopCourse = (studentId: string, body: CourseStopRequest) =>
  stops.stop(studentId, body);

export const profileCourseQuery = (input: Course & { kind: CourseMoveKind }) =>
  queryOptions({
    queryKey: courseKeys.move(input, input.kind),
    queryFn: () => apiFetch<ProfileCourseView>(courseMoveViewPath(input)),
  });

export const courseTeachersQuery = (studentId: string) =>
  queryOptions({
    queryKey: courseKeys.teachers(studentId),
    queryFn: () => apiFetch<BookingTeacherOption[]>(courseTeacherOptionsPath(studentId)),
  });

const OWN = new Set([
  'same_teacher',
  'teacher_inactive',
  'teacher_not_found',
  'subscription_not_found',
]);

/** The CourseChangeForm's routes for this student and kind, and the profile's own refusal codes. */
export const moveTarget = (input: {
  studentId: string;
  kind: CourseMoveKind;
  teacherId?: string;
}) => ({
  base: courseMoveBase(input),
  teacherId: input.teacherId,
  errorText: (error: unknown): string | null => {
    const code = courseMoveErrorCode(error);
    return OWN.has(code) ? t.courseActions.errors[code] : null;
  },
});

/**
 * After a write: the actions, the student (file, lists, status chip), the money and the lessons.
 * Literal roots keep this feature free of an import cycle with the pages that render it.
 */
export function useInvalidateCourseActions(studentId: string): () => Promise<void> {
  const client = useQueryClient();
  return async () => {
    const keys = [courseActionsKey(studentId), ['students'], ['money'], ['lessons'], ['sales']];
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
}

type StopInput = Course & {
  reason: string;
  /** `refund` cancels with a refund; `owe` cancels only. */
  ask: StopMoneyAsk;
  onDone: (done: StopDone) => void;
};

/** Includes the refund amount, the student's status now, the next step and who was told. */
export const stopDoneOf = (result: CourseStopResult, currency: string): StopDone =>
  stopDoneLines({
    result,
    words: t.courseActions.stop,
    format: {
      money: (amount) => moneyText(amount, currency),
      status: (status) => t.enums.studentStatus[status],
    },
  });

/** POST the stop with one idempotency key per dialog (rule 8), then re-read and the done block. */
export function useStopCourse(input: StopInput & { currency: string }) {
  const { studentId, subscriptionId, onDone } = input;
  const [requestId] = useState(() => crypto.randomUUID());
  const invalidate = useInvalidateCourseActions(studentId);
  const body = {
    subscriptionId,
    reason: input.reason,
    clientRequestId: requestId,
    ask: input.ask,
  };
  return useMutation({
    mutationFn: () => stopCourse(studentId, courseStopBody(body)),
    onSuccess: async (result) => {
      await invalidate();
      onDone(stopDoneOf(result, input.currency));
    },
  });
}
