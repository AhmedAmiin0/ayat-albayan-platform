import { z } from 'zod';
import { GENDERS, PACKAGE_SIZES, PROGRAMS } from '@ab/catalog';
import { BOOKING_KINDS } from '@ab/schedule';
import type { BookingDraft, StepKey } from '@/features/teaching/booking/draft/draft';
import {
  courseDraftSchema,
  durationSchema,
  invoiceDraftSchema,
  missedPickSchema,
  newStudentDraftSchema,
  pickedStudentSchema,
  teacherOptionSchema,
  trialDateDraftSchema,
} from './draft-parts.schemas';

const STEP_KEYS = [
  'students',
  'missed',
  'teacher',
  'package',
  'slot',
  'invoice',
  'review',
] as const satisfies readonly StepKey[];

const bookingDraftSchema = z.object({
  kind: z.enum(BOOKING_KINDS),
  invoice: invoiceDraftSchema.nullable(),
  missed: missedPickSchema.nullable(),
  chatPhone: z.string().nullable(),
  students: z.array(pickedStudentSchema),
  leadId: z.string().nullable(),
  newStudent: newStudentDraftSchema.nullable(),
  tz: z.string(),
  program: z.enum(PROGRAMS),
  genderPref: z.enum(GENDERS).nullable(),
  country: z.string().nullable(),
  teacher: teacherOptionSchema.nullable(),
  durationMin: durationSchema,
  startsAt: z.string().nullable(),
  extra: z.array(z.string()),
  outsideHours: z.boolean().optional(),
  course: courseDraftSchema.nullable(),
  trialDate: trialDateDraftSchema.nullable().optional(),
  pkg: z.enum(PACKAGE_SIZES),
  meetingLink: z.string(),
  requestId: z.string(),
  force: z.boolean(),
}) satisfies z.ZodType<BookingDraft>;

/** An unfinished admin booking as the tab keeps it: the draft and the step it was on. */
export const keptDraftSchema = z.object({
  draft: bookingDraftSchema,
  step: z.enum(STEP_KEYS),
});

export type KeptDraft = z.infer<typeof keptDraftSchema>;
