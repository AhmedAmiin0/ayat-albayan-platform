import type { BookingResult } from '@ab/schedule';
import { z } from 'zod';

// An unpaid package with an open payment link keeps the picked days as a draft, booked on payment.

/** POST /booking 201 (BookingResult), as the clients parse it. */
const bookingResultSchema: z.ZodType<BookingResult> = z.object({
  rule_id: z.string(),
  student_ids: z.array(z.string()),
  guardian_ids: z.array(z.string()),
  lessons: z.array(z.object({ id: z.string(), starts_at: z.string(), ends_at: z.string() })),
  message_ids: z.array(z.string()),
  invoice_id: z.string().nullable(),
});

/**
 * PUT /sales/booking/course/draft: `draft` = kept until the payment (saved again = edited);
 * `booked` = the package was paid meanwhile (or is not held), so the course was booked at once.
 */
export const courseDraftSavedSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('draft'), saved_at: z.string() }),
  z.object({ state: z.literal('booked'), booking: bookingResultSchema }),
]);
export type CourseDraftSaved = z.infer<typeof courseDraftSavedSchema>;

/** SalesCourseView.draft: the picks saved before the payment (the wizard prefills them). */
export interface CourseDraftInfo {
  saved_at: string;
}
