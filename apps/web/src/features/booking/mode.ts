import { createContext, useContext } from 'react';

// Booking mode: the same wizard under /admin/book (admin) and /sales/register (the assistant, base
// role sales). Admin is the default, so /admin/book needs no provider.

export type BookingMode = 'admin' | 'sales';

export const BookingModeContext = createContext<BookingMode>('admin');

export const useBookingMode = (): BookingMode => useContext(BookingModeContext);

/**
 * The booking routes of each mode (the one place to adjust at integration). The sales mirror takes
 * the same bodies and answers the same shapes as the admin's, scoped to the assistant:
 *   GET  {base}/teachers?program&gender   active teachers with load and availability
 *   GET  {base}/slots?teacherId&from&to&durationMin   the teacher's free starts (the slot grid)
 *   POST {base}/check                   the series' clashes, before «احجز»
 *   POST {base}                           guardian + student (+ lead) + trial booking; the new
 *                                         student is credited to the caller (brought_by);
 *                                         `leadId` is optional here, there is no `invoice`
 */
export const bookingBase = (mode: BookingMode): string => (mode === 'sales' ? '/sales/booking' : '/booking');
