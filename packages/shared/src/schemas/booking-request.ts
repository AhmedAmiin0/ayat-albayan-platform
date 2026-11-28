import { PACKAGE_SIZES, type PackageSize } from '@ab/catalog';
import { lessonsOf, PACKAGE_IDS, type PackageId } from '@ab/money';
import { z } from 'zod';
import { bookingBaseSchema, refineBookingKind, refineDayTimes } from '@ab/schedule';
import { guardianCreateSchema, studentCreateSchema } from '../people/schemas';

// POST /booking composes the schedule booking fields (@ab/schedule) with the people row schemas,
// so it lives in @ab/shared, above both (docs/32 k5a).

const uniqueIds = z
  .array(z.uuid())
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'duplicate_id' });

/**
 * POST /booking (R-SCH-06, R-LEAD-06, R-SCH-10): existing students, or a lead converted into a
 * guardian + new student. Exactly one of the two shapes; sending both is rejected. `kind` picks
 * trial / package / makeup (derived from `package` when omitted); a makeup is one existing student.
 */
export const bookingRequestSchema = z
  .xor([
    bookingBaseSchema.extend({ studentIds: uniqueIds, leadId: z.uuid().optional() }),
    bookingBaseSchema.extend({
      leadId: z.uuid(),
      newStudent: studentCreateSchema.omit({ guardian_id: true, teacher_id: true }),
      guardian: guardianCreateSchema,
      /** Create the student although the guardian has one with a similar name (R-STU-03). */
      force: z.boolean().optional(),
    }),
  ])
  .superRefine(refineBookingKind)
  .superRefine(refineDayTimes);

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/** Pricing catalog package (docs/08: starter, bulk, weekly…) → schedule_rules.package. */
export function packageSizeOf(id: PackageId): PackageSize {
  const lessons = String(lessonsOf(id));
  const size = PACKAGE_SIZES.find((s) => s === lessons);
  if (!size) throw new Error(`package ${id} has no package_size for ${lessons} lessons`);
  return size;
}

const catalogPackage = z.looseObject({ package: z.enum(PACKAGE_IDS) });

const withPackageSize = (body: z.input<typeof bookingRequestSchema>) => {
  const read = catalogPackage.safeParse(body);
  return read.success ? { ...read.data, package: packageSizeOf(read.data.package) } : body;
};

/** The booking and trial-date body: a catalog package id is read as its lesson count. */
export const bookingBodySchema = z.preprocess(withPackageSize, bookingRequestSchema);
