import { bookingRoutes, salesBookingRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { BookingCalls } from './booking-api.types';

/** The admin's booking wizard; answers parsed strictly. */
export function bookingCalls(client: ApiClient): BookingCalls {
  const call = callWith(client);
  return {
    teachers: (query) => call({ route: bookingRoutes.teachers, query }),
    slots: (query) => call({ route: bookingRoutes.slots, query }),
    outsideSlots: (query) => call({ route: bookingRoutes.outsideSlots, query }),
    check: (body) => call({ route: bookingRoutes.check, body }),
    book: (body) => call({ route: bookingRoutes.book, body }),
  };
}

/** The sales assistant's booking wizard, scoped to her own leads and students. */
export function salesBookingCalls(client: ApiClient): BookingCalls {
  const call = callWith(client);
  return {
    teachers: (query) => call({ route: salesBookingRoutes.teachers, query }),
    slots: (query) => call({ route: salesBookingRoutes.slots, query }),
    outsideSlots: (query) => call({ route: salesBookingRoutes.outsideSlots, query }),
    check: (body) => call({ route: salesBookingRoutes.check, body }),
    book: (body) => call({ route: salesBookingRoutes.book, body }),
  };
}
