import type { CourseChangeCheck, CourseChangeRequest, CourseChangeResult, CourseChangeView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import type { BookingMode } from '../mode';

// «تغيير أيام الحلقات» (owner 2026-10-18): the admin's /booking/course/change* and the assistant's
// mirror /sales/booking/course/change* (her own students, never over a clash).

/** The routes' base of each mode. */
export const courseChangeBase = (mode: BookingMode): string => (mode === 'sales' ? '/sales/booking/course' : '/booking/course');

/** The POST /…/change body: the check's plus its idempotency key (one per dialog, rule 8). */
export type CourseChangeBody = CourseChangeRequest & { clientRequestId: string };

/** GET /booking/course/change?subscriptionId= (admin): the course to change, from a lesson's drawer. */
export const courseChangeViewQuery = (subscriptionId: string) =>
  queryOptions({
    queryKey: ['booking', 'admin', 'course-change', subscriptionId],
    queryFn: () => apiFetch<CourseChangeView>(`/booking/course/change?subscriptionId=${encodeURIComponent(subscriptionId)}`),
  });

/** The check's key segment (left out of the refresh after a save). */
export const CHECK_KEY = 'course-change-check';

/** POST /…/change/check: the clashes over the remaining course and what is left; keyed without the request id. */
export const courseChangeCheckQuery = (body: CourseChangeBody, mode: BookingMode) => {
  const key: Partial<CourseChangeBody> = { ...body };
  delete key.clientRequestId;
  delete key.override;
  return queryOptions({
    queryKey: ['booking', mode, CHECK_KEY, JSON.stringify(key)],
    queryFn: () => apiSend<CourseChangeCheck>('POST', `${courseChangeBase(mode)}/change/check`, key),
    retry: false,
  });
};

/** POST /…/change: 201 the new rules; 409 conflict (the admin may resend with override.reason). */
export const changeCourse = (body: CourseChangeBody, mode: BookingMode) =>
  apiSend<CourseChangeResult>('POST', `${courseChangeBase(mode)}/change`, body);
