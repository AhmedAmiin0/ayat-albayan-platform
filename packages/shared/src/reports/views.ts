import type { LessonStatus, Program } from '@ab/catalog';
import type { BalanceView } from '@ab/money';
import type { ReportView } from './report-routes';
import type { MemoryView } from './v2/rules';

// Phase 3 report responses (docs/11 §4). snake_case rows like every API response; instants are
// ISO-8601 UTC strings.

export interface ReportAttachmentView {
  id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
}

/** Read-only identity the form shows (R-REP-01): never typed, taken from the lesson. */
export interface ReportFormLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  teacher: { id: string; display_name_ar: string; display_name_en?: string | null; tz: string };
}

export interface ReportFormEntry {
  student: { id: string; code: string; name: string; tz: string; program: Program };
  /** R-LES-03, issue A5: v_lesson_sequence.seq once completed, else prior completed lessons + 1. */
  lesson_no: number;
  /** The package the lesson counts against (v_subscription_balance), null without one. */
  package: BalanceView | null;
  report: ReportView;
  /** v2 reports only: the last saved range per track, read from the student's v2 reports. */
  memory?: MemoryView | null;
}

/** GET /lessons/:id/report-form: one entry per student on the lesson (group lessons, R-STU-04). */
export interface ReportFormResponse {
  lesson: ReportFormLesson;
  entries: ReportFormEntry[];
  /** reportBlock(...) for a submit now; drafts can always be saved. */
  submit_block: 'lesson_cancelled' | 'not_started' | null;
}

/** A signed URL to PUT a file to (Storage createSignedUploadUrl). */
export interface SignedUpload {
  bucket: string;
  path: string;
  token: string;
  signed_url: string;
}

/** A signed URL to GET a private file. */
export interface SignedDownload {
  url: string;
  expires_at: string;
}
