import type { LessonStatus } from '@ab/catalog';

// Makeup API shapes (R-SCH-10, R-PAY-03, R-MSG-06). Snake_case like every row;
// instants are ISO-8601 UTC strings.

/** GET /booking/makeup-candidates?studentId: a missed lesson that can still be made up. */
export interface MakeupCandidate {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  duration_min: number;
  teacher: { id: string; display_name_ar: string };
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
