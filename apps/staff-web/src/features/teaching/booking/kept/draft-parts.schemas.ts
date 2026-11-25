import { z } from 'zod';
import { DURATIONS, GENDERS, LEAD_SOURCES, PACKAGE_SIZES, PROGRAMS } from '@ab/catalog';
import { leadQualificationSchema } from '@ab/shared';

export const durationSchema = z.literal(DURATIONS);

export const invoiceDraftSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('upload'),
    path: z.string(),
    name: z.string(),
    mime: z.string(),
    preview: z.string().nullable(),
  }),
  z.object({
    source: z.literal('whatsapp'),
    messageId: z.string(),
    mime: z.string(),
    preview: z.string().nullable(),
  }),
]);

export const missedPickSchema = z.object({
  lessonId: z.string(),
  startsAt: z.string(),
  teacherId: z.string(),
  durationMin: durationSchema,
});

export const pickedStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
});

export const newStudentDraftSchema = z.object({
  name: z.string(),
  guardianName: z.string(),
  guardianPhone: z.string(),
  age: z.string().optional(),
  gender: z.enum(GENDERS).or(z.literal('')).optional(),
  source: z.enum(LEAD_SOURCES).or(z.literal('')).optional(),
  contactIsSelf: z.boolean().optional(),
  carried: leadQualificationSchema
    .pick({ level: true, memorized: true, goal: true, riwaya: true, notes: true })
    .optional(),
});

export const teacherOptionSchema = z.object({
  id: z.string(),
  display_name_ar: z.string(),
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)),
  tz: z.string(),
  meeting_link: z.string().nullable(),
  platform_classroom: z.boolean(),
  students_count: z.number(),
  max_students: z.number().nullable(),
  has_availability: z.boolean(),
});

export const courseDraftSchema = z.object({
  perWeek: z.number(),
  hold: z.boolean().optional(),
  lessonsTotal: z.number(),
  package: z.enum(PACKAGE_SIZES).nullable(),
  startsOn: z.string(),
  prefilled: z
    .array(z.object({ at: z.string(), weekday: z.number(), startTimeLocal: z.string() }))
    .readonly()
    .optional(),
});

export const trialDateDraftSchema = z.object({
  upcomingId: z.string().nullable(),
  upcomingAt: z.string().nullable(),
  count: z.number(),
});
