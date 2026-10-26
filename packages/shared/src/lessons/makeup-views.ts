import type { LessonStatus } from '../enums/index.js';
import type { BookingKind } from '../schemas/lessons/booking-extras.js';

// Makeup and invoice API shapes (R-SCH-10, R-PAY-03, R-MSG-06). Snake_case like every row;
// instants are ISO-8601 UTC strings.

/** GET /booking/makeup-candidates?studentId: a missed lesson that can still be made up. */
export interface MakeupCandidate {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  duration_min: number;
  teacher: { id: string; display_name_ar: string };
}

/** GET /invoices (admin only): the proof file of a booking; open it with GET /invoices/:id/download. */
export interface InvoiceView {
  id: string;
  rule_id: string | null;
  kind: Exclude<BookingKind, 'trial'>;
  mime: string;
  size_bytes: number;
  source: 'upload' | 'whatsapp';
  created_at: string;
  students: { id: string; name: string; code: string }[];
  /** GET /invoices/recent only: the payment recorded from it («سجّل كدفعة»), if any. */
  payment_id?: string | null;
}

/** GET /threads/:phone/media: an inbound image or PDF of that chat (metadata only, nothing downloaded). */
export interface ThreadMediaItem {
  message_id: string;
  created_at: string;
  mime: string;
  caption: string | null;
  /** Older than WhatsApp keeps the file (about 30 days) and never cached: it cannot be fetched any more. */
  expired: boolean;
}
