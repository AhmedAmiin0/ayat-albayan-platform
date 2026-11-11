import { z } from 'zod';
import { DURATIONS, PACKAGE_SIZES } from '@ab/catalog';
import { CANCEL_BY, STATUS_ROUTE_EVENTS } from '../lessons/state-machine.js';
import { bookingExtras } from './booking-extras.js';
import { requiredText, timeOfDay, timeZone } from '@ab/core';
import { dayTimesSchema } from './day-times.js';

// Scheduling commands (docs/10-phase2-contracts.md). Command DTOs are camelCase; POST /booking's
// schema joins the people row schemas in @ab/shared (k5a). Times are never free text (rule 6):
// wall-clock "HH:MM" + IANA tz, local dates "YYYY-MM-DD", instants ISO-8601 with offset.

export const localDate = z.iso.date();
export const instant = z.iso.datetime({ offset: true });
export const lessonDuration = z.literal(DURATIONS);

/** 0 = الأحد … 6 = السبت, at least one, no repeats. */
export const bydaySchema = z
  .array(z.int().min(0).max(6))
  .min(1)
  .refine((days) => new Set(days).size === days.length, { message: 'duplicate_day' });

/** Admin books over a conflict only with a reason (R-SCH-04); stored in lessons.override_reason. */
export const overrideSchema = z.object({ reason: requiredText });

/** A weekly rule: teacher + days + local start time in tz + duration, from a local date. */
export const weeklyRuleSchema = z.object({
  teacherId: z.uuid(),
  byday: bydaySchema,
  startTimeLocal: timeOfDay,
  tz: timeZone,
  durationMin: lessonDuration,
  startsOn: localDate,
});

/** A booking's fields without the students; @ab/shared's bookingRequestSchema adds them (k5a). */
export const bookingBaseSchema = weeklyRuleSchema.extend({
  /** Absent only for a makeup (kind 'makeup'); refined below. */
  package: z.enum(PACKAGE_SIZES).optional(),
  ...bookingExtras,
  meetingLink: z.url().nullish(),
  override: overrideSchema.optional(),
  /** Idempotency key: a replay with the same id returns the first booking (rule 8). */
  clientRequestId: z.uuid().optional(),
  /** The slot the admin picked; pins the first lesson when its wall time repeats (DST fall-back). */
  startsAt: instant.optional(),
  /** A package's weekdays with their own time (only those differing from startTimeLocal). */
  dayTimes: dayTimesSchema,
});

/** POST /lessons/:id/reschedule (R-SCH-07): one occurrence, or this rule from `startsOn` on. */
export const rescheduleRequestSchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('one'),
    startsAt: instant,
    /** Substitute teacher for this occurrence; defaults to the lesson's teacher. */
    teacherId: z.uuid().optional(),
    override: overrideSchema.optional(),
  }),
  z.object({
    scope: z.literal('rule'),
    newRule: weeklyRuleSchema,
    override: overrideSchema.optional(),
  }),
]);

/** POST /lessons/:id/cancel (R-SCH-07). `rule` = this occurrence and every later one. */
export const cancelRequestSchema = z.object({
  scope: z.enum(['one', 'rule']),
  by: z.enum(CANCEL_BY),
  reason: requiredText,
});

/** POST /teachers/me/lessons/:id/cancel (docs/46 D3): one lesson, a reason; by / scope forced. */
export const teacherCancelSchema = z.object({ reason: requiredText.max(500) });
export type TeacherCancelRequest = z.infer<typeof teacherCancelSchema>;

/** POST /schedule-rules/:id/cancel — ends the rule from `from` (default: today in rule.tz). */
export const ruleCancelRequestSchema = z.object({
  by: z.enum(CANCEL_BY),
  reason: requiredText,
  from: localDate.optional(),
});

/** POST /schedule-rules/:id/extend — weeks ahead from now (default settings.booking_horizon_weeks). */
export const ruleExtendRequestSchema = z.object({ weeks: z.int().min(1).max(12).optional() });

/**
 * POST /lessons/:id/status — attendance outcomes (R-SCH-08). `event` is the lesson's outcome;
 * `students` overrides it per student in a group or sibling lesson (R-STU-04).
 */
export const lessonStatusRequestSchema = z.object({
  event: z.enum(STATUS_ROUTE_EVENTS),
  students: z
    .array(z.object({ studentId: z.uuid(), event: z.enum(STATUS_ROUTE_EVENTS) }))
    .optional(),
});

/** POST /lessons/:id/propose — the teacher's «اقترح ميعاد تاني» (R-SCH-08). */
export const lessonProposalRequestSchema = z.object({
  startsAt: instant,
  note: z.string().trim().max(500).optional(),
});
/** POST /lesson-proposals/:id/approve — the move is a reschedule, so a clash needs a reason. */
export const proposalApproveSchema = z.object({ override: overrideSchema.optional() });

export type RescheduleRequest = z.infer<typeof rescheduleRequestSchema>;
export type CancelRequest = z.infer<typeof cancelRequestSchema>;
export type RuleCancelRequest = z.infer<typeof ruleCancelRequestSchema>;
export type RuleExtendRequest = z.infer<typeof ruleExtendRequestSchema>;
export type LessonStatusRequest = z.infer<typeof lessonStatusRequestSchema>;
export type WeeklyRule = z.infer<typeof weeklyRuleSchema>;
export type LessonProposalRequest = z.infer<typeof lessonProposalRequestSchema>;
export type ProposalApprove = z.infer<typeof proposalApproveSchema>;
