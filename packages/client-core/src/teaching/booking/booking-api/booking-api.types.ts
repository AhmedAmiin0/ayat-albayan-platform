import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { bookingRoutes, salesBookingRoutes } from '@ab/shared';

type Routes = typeof bookingRoutes | typeof salesBookingRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface BookingCalls {
  teachers: (query: RouteQuery<Routes['teachers']>) => Answer<'teachers'>;
  slots: (query: RouteQuery<Routes['slots']>) => Answer<'slots'>;
  outsideSlots: (query: RouteQuery<Routes['outsideSlots']>) => Answer<'outsideSlots'>;
  check: (body: RouteBody<Routes['check']>) => Answer<'check'>;
  book: (body: RouteBody<Routes['book']>) => Answer<'book'>;
}
