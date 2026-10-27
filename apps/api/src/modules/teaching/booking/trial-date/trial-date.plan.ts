import type { LessonStatus } from '@ab/shared';
import type { ChangeSet, QueuedMessage } from '../../scheduling/change-set';
import type { BookingPayload } from '../core/booking.mapper';
import type { MessageDraft } from '../core/booking.messages';

// The write of «موعد تجريبي جديد» (owner 2026-10-25), planned from the booking planner's payload:
// with no upcoming trial it IS that booking (create_booking); with one, the same lesson, link,
// override reason and confirmation become a move of that trial (apply_lesson_changes): the old row
// `rescheduled`, the new one on the same rule with rescheduled_from_id. Pure.

/** pick_trial_date's argument (migration 20261025000660). */
export type TrialPick = {
  actor: string;
  student_ids: string[];
  teacher_id: string;
  booking?: BookingPayload;
  change?: ChangeSet;
};

/** The upcoming trial a new date moves. */
export interface MovedTrial {
  id: string;
  rule_id: string | null;
  status: LessonStatus;
  starts_at: string;
  teacher_id: string;
  student_ids: string[];
}

interface PickInput {
  payload: BookingPayload;
  actorId: string;
}

const VIA = 'trial_new_date';

/** No upcoming trial: the booking itself, its audit row marked as a new trial date. */
export function bookPick({ payload, actorId }: PickInput): TrialPick {
  const audit = { after: { ...payload.audit.after, via: VIA } };
  return { actor: actorId, student_ids: payload.student_ids, teacher_id: payload.rule.teacher_id, booking: { ...payload, audit } };
}

/** The booking's confirmations for the new lesson (existing guardians only; the lead path never moves). */
function queued(drafts: readonly MessageDraft[], lessonId: string): QueuedMessage[] {
  return drafts.flatMap((m) =>
    m.guardian_id
      ? [{ ...m, guardian_id: m.guardian_id, lesson_id: lessonId, dedup_key: `booking_confirmation:${lessonId}:${m.guardian_id}` }]
      : [],
  );
}

type MoveInput = PickInput & { old: MovedTrial; lessonId: string };

/** The upcoming trial moves: `lessonId` (the request id) is the new row's id, so a replay finds it. */
export function movePick({ payload, actorId, old, lessonId }: MoveInput): TrialPick | null {
  const [lesson] = payload.lessons;
  if (!lesson) return null;
  const teacherId = payload.rule.teacher_id;
  const change: ChangeSet = {
    actor: actorId,
    changes: [{ id: old.id, from_status: old.status, to_status: 'rescheduled', chargeable: false }],
    lessons: [{ id: lessonId, rule_id: old.rule_id, teacher_id: teacherId, ...lesson, rescheduled_from_id: old.id, student_ids: old.student_ids }],
    messages: queued(payload.messages, lessonId),
    audit: {
      entity: 'lessons',
      entity_id: old.id,
      action: VIA,
      before: { status: old.status, starts_at: old.starts_at, teacher_id: old.teacher_id },
      after: { lesson_id: lessonId, starts_at: lesson.starts_at, teacher_id: teacherId, override_reason: lesson.override_reason },
    },
  };
  return { actor: actorId, student_ids: old.student_ids, teacher_id: teacherId, change };
}
