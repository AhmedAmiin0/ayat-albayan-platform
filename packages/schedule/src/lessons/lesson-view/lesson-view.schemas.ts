import { attendanceSchema, lessonStatusSchema, REPORT_STATUSES } from '@ab/catalog';
import { id } from '@ab/core';
import { z } from 'zod';
import { lessonRoomStateSchema } from '../../classroom';
import { conflictSchema } from '../conflicts';
import { proposalRequesterSchema } from '../proposals/proposals';
import { lessonEventSchema } from '../state-machine/state-machine';

// API response shapes (docs/10-phase2-contracts.md §3): snake_case rows, ISO UTC, IANA tz.

/** R-SCH-11: a planned lesson moves; a held one has its time corrected. */
export const TIME_EDIT_MODES = ['move', 'correct'] as const;
export const timeEditModeSchema = z.enum(TIME_EDIT_MODES);
export type TimeEditMode = z.infer<typeof timeEditModeSchema>;

/** LessonView.time_edit: the last in-place edit, from lessons.time_edit_*. */
export const lessonTimeEditViewSchema = z.object({
  at: z.string(),
  reason: z.string().nullable(),
  was: z.object({ starts_at: z.string(), ends_at: z.string() }),
});
export type LessonTimeEditView = z.infer<typeof lessonTimeEditViewSchema>;

/** A proposed new time for one lesson; staff approve (a reschedule) or reject. */
export const lessonProposalViewSchema = z.object({
  id: id(),
  proposed_starts_at: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
  /** Absent in an old cache: the teacher's. */
  requested_by: proposalRequesterSchema.optional(),
});
export type LessonProposalView = z.infer<typeof lessonProposalViewSchema>;

/** This student's lesson report, null before one is opened; edit window per docs/46 B7. */
const studentReportSchema = z.object({
  id: id(),
  status: z.enum(REPORT_STATUSES),
  submitted_at: z.string().nullish(),
  sent_at: z.string().nullish(),
  can_edit: z.boolean().optional(),
  edit_until: z.string().nullish(),
});

/** One student on a lesson; code, name and tz are blank when the student row was unreadable. */
export const lessonStudentViewSchema = z.object({
  id: id(),
  code: z.string(),
  name: z.string(),
  tz: z.string(),
  attendance: attendanceSchema.nullable(),
  chargeable: z.boolean(),
  /** Lesson number for this student (v_lesson_sequence), null until the lesson is completed. */
  seq: z.number().int().nullable(),
  /** R-SUB-02: true on a future open lesson when the newest package is unpaid with nothing left. */
  unpaid: z.boolean().optional(),
  /** The active makeup booked for this student's miss; others in a group may have none. */
  makeup: z.object({ lesson_id: id(), starts_at: z.string() }).nullish(),
  report: studentReportSchema.nullish(),
});
export type LessonStudentView = z.infer<typeof lessonStudentViewSchema>;

/** avatar_url: a short-lived signed URL, on staff views only; null or absent: initials. */
const lessonTeacherSchema = z.object({
  id: id(),
  display_name_ar: z.string(),
  display_name_en: z.string().nullish(),
  tz: z.string(),
  avatar_url: z.string().nullish(),
});

/** Fields marked «absent in an old cache» stay optional for payloads cached before them. */
const lessonExtrasSchema = z.object({
  /** The weekly rule's weekdays (0 = Sunday) in its zone; null for a one-off. */
  rule_byday: z.array(z.number().int().min(0).max(6)).nullish(),
  /** The rule is a trial; a one-off move keeps it; absent in an old cache. */
  trial: z.boolean().optional(),
  /** The assistant course its rule belongs to (schedule_rules.subscription_id). */
  course_subscription_id: id().nullish(),
  /** A makeup replaces a missed lesson and never consumes a package unit. */
  makeup: z.boolean().optional(),
  makeup_of: z.object({ id: id(), starts_at: z.string() }).nullish(),
  /** Settled by the job (or corrected since), no report since: staff may still correct it. */
  auto_held: z.boolean().optional(),
  /** The teacher holds it in our classroom (migration 490): clients hide the fixed link then. */
  platform_classroom: z.boolean().optional(),
  /** docs/46 D1: the teacher will attend; never the status; absent in an old cache. */
  teacher_confirmed_at: z.string().nullish(),
  /** The room opened early (joinWindow); an instant lesson never consumes a package. */
  room_opened_at: z.string().nullish(),
  /** Who is in and the end-for-all stamp; null: nobody, not ended. */
  room: lessonRoomStateSchema.nullish(),
  instant: z.boolean().optional(),
  /** R-SCH-11: what an admin may do to the time (null = nothing, and for teachers). */
  time_edit_mode: timeEditModeSchema.nullish(),
  /** The last in-place time edit (the time it replaced), null when never edited. */
  time_edit: lessonTimeEditViewSchema.nullish(),
});

/** GET /lessons, /lessons/day, /teachers/me/lessons, /students/:id/lessons items. */
export const lessonViewSchema = lessonExtrasSchema.extend({
  id: id(),
  rule_id: id().nullable(),
  teacher: lessonTeacherSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  status: lessonStatusSchema,
  /** Copied onto the lesson at creation (R-LES-01), sent to the guardian (R-LES-02). */
  meeting_link: z.string().nullable(),
  cancel_reason: z.string().nullable(),
  override_reason: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  rescheduled_from_id: id().nullable(),
  students: z.array(lessonStudentViewSchema),
  /** allowedLessonEvents(status) minus what the caller's role may not do. */
  allowed_events: z.array(lessonEventSchema),
  /** Clashes found when a job generated this lesson without an admin override (R-SCH-04). */
  conflicts: z.array(conflictSchema),
  /** The teacher's or family's pending move request (R-SCH-08), null when none. */
  pending_proposal: lessonProposalViewSchema.nullable(),
});
export type LessonView = z.infer<typeof lessonViewSchema>;
