import {
  courseActionsKey,
  courseStopBody,
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
import { t } from '@/lib/i18n/i18n';
import { useState } from 'react';
import { apiFetch, apiSend } from '@/lib/http/api';

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

/** Which GET resolves the student's current package: the first one the viewer may call. */
export type CurrentVia = 'stop' | CourseMoveKind;

/**
 * The student's current package id, from the server (no subscriptionId: the newest live one)
 * through a route the viewer holds; 404 subscription_not_found = nothing to act on.
 */
export const currentCourseQuery = (studentId: string, via: CurrentVia) =>
  queryOptions({
    queryKey: [...courseActionsKey(studentId), 'current', via],
    queryFn: async (): Promise<string> => {
      if (via === 'stop') {
        return (await apiFetch<CourseStopPreview>(courseStopPath(studentId))).subscriptionId;
      }
      const path = `${courseMoveBase({ studentId, kind: via })}/change`;
      return (await apiFetch<ProfileCourseView>(path)).course.subscriptionId;
    },
    retry: false,
  });

/** The course to change, with «من تاريخ»'s default (the next lesson). */
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
  /** The money choice: `refund` («إلغاء مع استرداد») or `owe` («إلغاء فقط»). */
  ask: StopMoneyAsk;
  onDone: (message: string) => void;
};

/** The toast: «أُلغي الاشتراك…», with the refund's amount when there was one. */
function doneText(result: CourseStopResult, currency: string): string {
  const words = t.courseActions.stop;
  const refund = result.refund;
  return refund
    ? words.doneRefund.replace('{amount}', moneyText(refund.amount, currency))
    : words.done;
}

/** POST the stop with one idempotency key per dialog (rule 8), then re-read and the toast. */
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
      onDone(doneText(result, input.currency));
    },
  });
}
