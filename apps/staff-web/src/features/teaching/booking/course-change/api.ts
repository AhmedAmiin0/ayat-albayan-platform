import type { BookingMode } from '@ab/client-core';
import type { CourseChangeCheck, CourseChangeResult, CourseChangeView } from '@ab/shared';
import type { CourseChangeRequest } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { apiFetch, apiSend } from '@ab/web-kit';
import { bookingKeys, COURSE_CHANGE_CHECK } from '@/features/teaching/booking/booking.keys';

// The assistant's mirror routes cover her own students only, never over a clash.

/** The routes' base of each mode. */
export const courseChangeBase = (mode: BookingMode): string =>
  mode === 'sales' ? '/sales/booking/course' : '/booking/course';

/** Another route set for the same form, from the student profile, plus the new teacher. */
export interface CourseChangeTarget {
  base: string;
  teacherId?: string | undefined;
  /** The target's own refusal codes' text; null = the booking's (lessonErrorText). */
  errorText?: ((error: unknown) => string | null) | undefined;
}

/** Set by the profile's dialogs; absent = the booking mode's routes. */
export const CourseChangeTargetContext = createContext<CourseChangeTarget | null>(null);

export const useCourseChangeTarget = (): CourseChangeTarget | null =>
  useContext(CourseChangeTargetContext);

const baseOf = (mode: BookingMode, target: CourseChangeTarget | null): string =>
  target?.base ?? courseChangeBase(mode);

const withTeacher = <T extends object>(body: T, target: CourseChangeTarget | null): T =>
  target?.teacherId ? { ...body, teacherId: target.teacherId } : body;

/** The POST /…/change body: the check's plus its idempotency key (one per dialog, rule 8). */
export type CourseChangeBody = CourseChangeRequest & { clientRequestId: string };

/** GET /booking/course/change?subscriptionId= (admin): the course to change, from a lesson's drawer. */
export const courseChangeViewQuery = (subscriptionId: string) =>
  queryOptions({
    queryKey: bookingKeys.courseChange(subscriptionId),
    queryFn: () =>
      apiFetch<CourseChangeView>(
        `/booking/course/change?subscriptionId=${encodeURIComponent(subscriptionId)}`,
      ),
  });

/** The check's key segment (left out of the refresh after a save). */
export const CHECK_KEY = COURSE_CHANGE_CHECK;

/** gcTime 0: a kept answer would show the old summary and enable save when the same days repeat. */
export const courseChangeCheckQuery = (
  body: CourseChangeBody,
  mode: BookingMode,
  target: CourseChangeTarget | null = null,
) => {
  const key: Partial<CourseChangeBody> = withTeacher({ ...body }, target);
  delete key.clientRequestId;
  delete key.override;
  const base = baseOf(mode, target);
  return queryOptions({
    queryKey: bookingKeys.courseChangeCheck(mode, base, JSON.stringify(key)),
    queryFn: () => apiSend<CourseChangeCheck>('POST', `${base}/change/check`, key),
    retry: false,
    gcTime: 0,
  });
};

/** POST /…/change: 201 the new rules; 409 conflict (the admin may resend with override.reason). */
export const changeCourse = (
  body: CourseChangeBody,
  mode: BookingMode,
  target: CourseChangeTarget | null = null,
) =>
  apiSend<CourseChangeResult>('POST', `${baseOf(mode, target)}/change`, withTeacher(body, target));
