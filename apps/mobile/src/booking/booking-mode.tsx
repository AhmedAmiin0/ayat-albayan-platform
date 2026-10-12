import { createContext, type ReactNode, useContext } from 'react';

/**
 * Who books (the web's features/booking/mode.ts): the admin, or a salesperson registering a new
 * student from a chat («تسجيل طالب جديد», docs/16). The sales mirror under /sales/booking takes the
 * same bodies and answers the same shapes, scoped to her own leads: a trial only, no price, no
 * invoice, and the new student is credited to her (brought_by). Admin is the default.
 */
export type BookingMode = 'admin' | 'sales';

const BookingModeContext = createContext<BookingMode>('admin');

export function BookingModeProvider({ value, children }: { value: BookingMode; children: ReactNode }) {
  return <BookingModeContext.Provider value={value}>{children}</BookingModeContext.Provider>;
}

export function useBookingMode(): BookingMode {
  return useContext(BookingModeContext);
}

/** A booking route of this mode: `/booking…` or `/sales/booking…`. */
export function bookingPath(mode: BookingMode, path = ''): string {
  return `${mode === 'sales' ? '/sales/booking' : '/booking'}${path}`;
}
