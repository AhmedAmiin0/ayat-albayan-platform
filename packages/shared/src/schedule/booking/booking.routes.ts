import { defineRoute, type RouteSpec } from '@ab/core';
import {
  bookingConflictsSchema,
  bookingResultSchema,
  bookingTeacherOptionSchema,
  outsideSlotsQuerySchema,
  slotsQuerySchema,
  slotsResponseSchema,
  teacherOptionsQuerySchema,
} from '@ab/schedule';
import { bookingBodySchema, outsideSlotsResponseSchema } from '../../schemas';

type Access = Required<Pick<RouteSpec, 'permissions' | 'tags'>>;

/** The booking wizard (R-SCH-06, R-SCH-04; docs/10 §5 #12–14) under one base. */
const bookingRoutesAt = <B extends string, A extends Access>(base: B, access: A) => ({
  /** Active teachers of the program, filtered by gender, with load and availability. */
  teachers: defineRoute({
    method: 'GET',
    path: `${base}/teachers`,
    query: teacherOptionsQuerySchema,
    response: bookingTeacherOptionSchema.array(),
    ...access,
  }),
  /** At most 14 days: 400 range_too_large; 404 teacher_not_found. */
  slots: defineRoute({
    method: 'GET',
    path: `${base}/slots`,
    query: slotsQuerySchema,
    response: slotsResponseSchema,
    ...access,
  }),
  /** The next 14 days of the server clock, inside the teacher hours or not. */
  outsideSlots: defineRoute({
    method: 'GET',
    path: `${base}/outside-slots`,
    query: outsideSlotsQuerySchema,
    response: outsideSlotsResponseSchema,
    ...access,
  }),
  /** 200, nothing written. */
  check: defineRoute({
    method: 'POST',
    path: `${base}/check`,
    body: bookingBodySchema,
    response: bookingConflictsSchema,
    ...access,
  }),
  /** 201; 409 conflict unless override.reason; 400 invoice_required (R-PAY-03). */
  book: defineRoute({
    method: 'POST',
    path: base,
    body: bookingBodySchema,
    response: bookingResultSchema,
    ...access,
  }),
});

export const bookingRoutes = bookingRoutesAt('/booking', {
  permissions: ['booking.write'],
  tags: ['booking'],
});

/**
 * The assistant's trials and courses (R-ASST-01), scoped to her own leads and students; 403
 * override_not_allowed, kind_not_allowed, meeting_link_not_allowed, invoice_not_allowed.
 */
export const salesBookingRoutes = bookingRoutesAt('/sales/booking', {
  permissions: ['self.sales'],
  tags: ['booking'],
});
