// «رأيك يهمّنا» (student feedback) rows, as the API's feedback module serves them.
// ponytail: stand-ins for FeedbackRowView / TeacherFeedbackView of packages/shared (the API
// builder defines them); swap these imports for the shared types once both branches are merged.

export type FeedbackKind = 'trial' | 'subscription';
export type FeedbackRecommend = 'yes' | 'maybe' | 'no';

export interface FeedbackRowView {
  id: string;
  lesson_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  kind: FeedbackKind;
  /** null while the request is pending (sent, not answered). */
  rating: number | null;
  recommend: FeedbackRecommend | null;
  note: string | null;
  /** Admins only: a teacher's rows leave the contact number out. */
  contact_phone?: string | null;
  requested_at: string;
  submitted_at: string | null;
}

export interface FeedbackAverage {
  avg_rating: number | null;
  /** Answered responses. */
  n: number;
  recommend_yes_pct: number | null;
}

/** GET /feedback/summary: one row per teacher. */
export interface TeacherAverage extends FeedbackAverage {
  teacher_id: string;
  teacher_name: string;
}

/** GET /teachers/me/feedback: my own rows and my own average. */
export interface MyFeedbackView {
  average: FeedbackAverage;
  items: FeedbackRowView[];
}
