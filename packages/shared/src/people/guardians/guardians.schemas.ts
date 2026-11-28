import { LEAD_SOURCES, STUDENT_STATUSES } from '@ab/catalog';
import { blanksToNull, pageQuery } from '@ab/core';
import { z } from 'zod';
import { guardianCreateSchema, guardianUpdateSchema } from '../schemas';

/** The guardians and students lists: a name or number search, 20 a page (R-NFR-08). */
export const peopleListQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  ...pageQuery({ size: 20 }),
});
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;

export const guardianCreateBodySchema = blanksToNull(guardianCreateSchema);
export const guardianUpdateBodySchema = blanksToNull(guardianUpdateSchema);

/** A guardians row as the api answers it (R-STU-02). */
export const guardianViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone_e164: z.string(),
  country: z.string().nullable(),
  tz: z.string(),
  source: z.enum(LEAD_SOURCES).nullable(),
  notes: z.string().nullable(),
  profile_id: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GuardianView = z.infer<typeof guardianViewSchema>;

/** One number of a family: the main one (is_primary) or a second one. */
export const familyPhoneSchema = z.object({ phone_e164: z.string(), is_primary: z.boolean() });

const familyNumberSchema = familyPhoneSchema.extend({ created_at: z.string() });

const siblingSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
});

/** GET /guardians/:id: the row, its students (siblings) and every family number. */
export const guardianDetailSchema = guardianViewSchema.extend({
  students: z.array(siblingSchema),
  phones: z.array(familyNumberSchema),
});
export type GuardianDetail = z.infer<typeof guardianDetailSchema>;
