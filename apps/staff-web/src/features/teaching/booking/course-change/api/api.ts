import { courseChangeCalls, salesCourseCalls, type BookingMode } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { apiFetch, apiSend } from '@ab/web-kit';
import { bookingKeys, COURSE_CHANGE_CHECK } from '@/features/teaching/booking/booking.keys';
import type { CourseChangeBody, CourseChangeTarget } from './api.types';

// The assistant's mirror routes cover her own students only, never over a clash.

const adminCourse = courseChangeCalls({ apiFetch, apiSend });
const salesCourse = salesCourseCalls({ apiFetch, apiSend });

const modeTargets = {
  admin: { key: 'admin', check: adminCourse.check, change: adminCourse.change },
  sales: { key: 'sales', check: salesCourse.check, change: salesCourse.change },
};

/** Set by the profile's dialogs; absent = the booking mode's routes. */
export const CourseChangeTargetContext = createContext<CourseChangeTarget | null>(null);

export const useCourseChangeTarget = (): CourseChangeTarget | null =>
  useContext(CourseChangeTargetContext);

const targetOf = (mode: BookingMode, target: CourseChangeTarget | null): CourseChangeTarget =>
  target ?? modeTargets[mode];

/** The admin's read of the course to change, from a lesson's drawer. */
export const courseChangeViewQuery = (subscriptionId: string) =>
  queryOptions({
    queryKey: bookingKeys.courseChange(subscriptionId),
    queryFn: () => adminCourse.view(subscriptionId),
  });

/** The check's key segment (left out of the refresh after a save). */
export const CHECK_KEY = COURSE_CHANGE_CHECK;

/** gcTime 0: a kept answer would show the old summary and enable save when the same days repeat. */
export const courseChangeCheckQuery = (
  body: CourseChangeBody,
  mode: BookingMode,
  target: CourseChangeTarget | null = null,
) => {
  const key = { ...body, clientRequestId: undefined, override: undefined };
  const { check, key: scope } = targetOf(mode, target);
  return queryOptions({
    queryKey: bookingKeys.courseChangeCheck(mode, scope, JSON.stringify(key)),
    queryFn: () => check(key),
    retry: false,
    gcTime: 0,
  });
};

/** POST /…/change: 201 the new rules; 409 conflict (the admin may resend with override.reason). */
export const changeCourse = (
  body: CourseChangeBody,
  mode: BookingMode,
  target: CourseChangeTarget | null = null,
) => targetOf(mode, target).change(body);
