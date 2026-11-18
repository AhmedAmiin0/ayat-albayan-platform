// Who books (web booking/mode.ts, mobile booking/shared/booking-mode.tsx): the admin under
// /booking, or a salesperson registering a new student from a chat under /sales/booking (docs/16).

/** The booking routes' owner; admin is the default. */
export type BookingMode = 'admin' | 'sales';
