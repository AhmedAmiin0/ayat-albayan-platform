import { id, instant } from '@ab/core';
import { z } from 'zod';
import { BOOKING_KINDS } from './booking-extras';

const invoiceStudentSchema = z.object({ id: id(), name: z.string(), code: z.string() });

/** GET /invoices (admin only): a booking's proof file; open it with GET /invoices/:id/download. */
export const invoiceViewSchema = z.object({
  id: id(),
  rule_id: id().nullable(),
  kind: z.enum(BOOKING_KINDS).exclude(['trial']),
  mime: z.string(),
  size_bytes: z.number().int(),
  source: z.enum(['upload', 'whatsapp']),
  created_at: instant,
  students: z.array(invoiceStudentSchema),
  /** GET /invoices/recent only: the payment recorded from this invoice, if any. */
  payment_id: id().nullish(),
});
export type InvoiceView = z.infer<typeof invoiceViewSchema>;
