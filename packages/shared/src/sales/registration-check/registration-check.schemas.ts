import { STUDENT_STATUSES } from '@ab/catalog';
import { z } from 'zod';

/** One registered child: exactly these four keys (docs/16 row 23). */
export const registrationMatchSchema = z.strictObject({
  name: z.string(),
  code: z.string(),
  status: z.enum(STUDENT_STATUSES),
  teacher_name: z.string().nullable(),
});
export type RegistrationMatch = z.infer<typeof registrationMatchSchema>;

/** `more`: there were over REGISTRATION_CHECK_MAX matches. */
export const registrationCheckViewSchema = z.strictObject({
  found: z.boolean(),
  matches: z.array(registrationMatchSchema),
  more: z.boolean(),
});
export type RegistrationCheckView = z.infer<typeof registrationCheckViewSchema>;
