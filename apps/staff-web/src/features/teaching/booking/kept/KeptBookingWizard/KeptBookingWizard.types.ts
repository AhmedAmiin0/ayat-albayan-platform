import type { BookingWizardProps } from '@/features/teaching/booking/BookingWizard';

export interface KeptBookingWizardProps extends Omit<
  BookingWizardProps,
  'initialStep' | 'onProgress'
> {
  /** The /admin/book entry the draft belongs to (keptKey). */
  keepKey: string;
  /** Whether the booking is started and not booked yet, on every change (the leave guard). */
  onUnfinished?: ((unfinished: boolean) => void) | undefined;
}
