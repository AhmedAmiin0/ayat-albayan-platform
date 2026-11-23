import {
  courseActionsKey,
  courseStopBody,
  stopDoneLines,
  type StopDone,
  courseMoveBase,
  courseMoveErrorCode,
  courseMoveViewPath,
  courseStopPath,
  courseStopPreviewPath,
  courseTeacherOptionsPath,
  type CourseMoveKind,
  type StopMoneyAsk,
} from '@ab/client-core';
import type {
  BookingTeacherOption,
  CourseStopPreview,
  CourseStopRequest,
  CourseStopResult,
  ProfileCourseView,
} from '@ab/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useState } from 'react';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// The student profile's course actions (owner 2026-10-30): apps/api course-stop and
// booking/profile. Paths and the key come from @ab/client-core (the same as mobile).

interface Course {
  studentId: string;
  subscriptionId: string;
}

export const courseStopPreviewQuery = (input: Course) =>
  queryOptions({
    queryKey: [...courseActionsKey(input.studentId), 'stop', input.subscriptionId],
    queryFn: () => apiFetch<CourseStopPreview>(courseStopPreviewPath(input)),
  });

export const stopCourse = (studentId: string, body: CourseStopRequest) =>
  apiSend<CourseStopResult>('POST', courseStopPath(studentId), body);

export const profileCourseQuery = (input: Course & { kind: CourseMoveKind }) =>
  queryOptions({
    queryKey: [...courseActionsKey(input.studentId), input.kind, input.subscriptionId],
    queryFn: () => apiFetch<ProfileCourseView>(courseMoveViewPath(input)),
  });

export const courseTeachersQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...courseActionsKey(studentId), 'teachers'],
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
