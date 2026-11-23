import type { BookingMode } from '@ab/client-core';
import { createContext, useContext } from 'react';

// Same wizard for admin and the sales registration dialog; admin is the default, no provider.

export const BookingModeContext = createContext<BookingMode>('admin');

export const useBookingMode = (): BookingMode => useContext(BookingModeContext);

/** Inside a sales chat dialog, returning closes it instead of linking to the inbox. */
export const ChatReturnContext = createContext<(() => void) | null>(null);

export const useChatReturn = (): (() => void) | null => useContext(ChatReturnContext);

/** A course's picks kept as a draft until the payment (owner 2026-11-06): the dialog says so. */
export const CourseHeldContext = createContext<(() => void) | null>(null);

export const useCourseHeld = (): (() => void) | null => useContext(CourseHeldContext);

/** Sales mirror routes take the same bodies and shapes as the admin's, scoped to the assistant. */
export const bookingBase = (mode: BookingMode): string => (mode === 'sales' ? '/sales/booking' : '/booking');
