import type { TablesInsert, TablesUpdate } from '@ab/db';
import type { FeedbackKind, LessonRating } from '@ab/shared';

// A guardian's lesson_rating tap → lesson_feedback rows (pure; migration 195).

export interface RatingTap {
  lessonId: string;
  guardianId: string;
  rating: LessonRating;
  /** The inbound wamid (the webhook already stops a replay of it before this runs). */
  waMessageId: string;
  /** When they tapped (Meta's timestamp). */
  at: Date;
}

export interface RatedLesson {
  teacherId: string;
  kind: FeedbackKind;
  /** This guardian's children on the lesson. */
  studentIds: string[];
}

/** The answer's columns: written over an existing row (form link or an earlier tap) as they are. */
export function ratingPatch(tap: RatingTap): Required<Pick<TablesUpdate<'lesson_feedback'>, 'quick_rating' | 'quick_rated_at' | 'quick_rating_wa_id'>> {
  return { quick_rating: tap.rating, quick_rated_at: tap.at.toISOString(), quick_rating_wa_id: tap.waMessageId };
}

/**
 * New rows for children with no feedback row yet: made by the button (source whatsapp_button),
 * without a link (token_hash null; a later «ابعت طلب الرأي» gives the row one). expires_at is the
 * tap: there is no link to keep alive.
 */
export function ratingInserts(tap: RatingTap, lesson: RatedLesson): TablesInsert<'lesson_feedback'>[] {
  const at = tap.at.toISOString();
  return lesson.studentIds.map((studentId) => ({
    lesson_id: tap.lessonId,
    student_id: studentId,
    guardian_id: tap.guardianId,
    teacher_id: lesson.teacherId,
    kind: lesson.kind,
    token_hash: null,
    requested_at: at,
    expires_at: at,
    source: 'whatsapp_button' as const,
    ...ratingPatch(tap),
  }));
}
