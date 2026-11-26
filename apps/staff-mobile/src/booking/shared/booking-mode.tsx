import type { BookingMode } from '@ab/client-core';
import { createContext, type ReactNode, useContext } from 'react';

/** docs/16: sales mirror is her own leads only: trial, no price or invoice, credited to her. */
const BookingModeContext = createContext<BookingMode>('admin');

export function BookingModeProvider({
  value,
  children,
}: {
  value: BookingMode;
  children: ReactNode;
}) {
  return <BookingModeContext.Provider value={value}>{children}</BookingModeContext.Provider>;
}

export function useBookingMode(): BookingMode {
  return useContext(BookingModeContext);
}

/** A booking route of this mode: `/booking…` or `/sales/booking…`. */
export function bookingPath(mode: BookingMode, path = ''): string {
  return `${mode === 'sales' ? '/sales/booking' : '/booking'}${path}`;
}
