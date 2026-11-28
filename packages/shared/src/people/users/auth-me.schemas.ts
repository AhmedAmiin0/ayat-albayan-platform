import { permissionSchema, userRoleSchema } from '@ab/catalog';
import { id, LOCALES } from '@ab/core';
import { z } from 'zod';

/**
 * GET /auth/me: the signed-in login as the api verified it. Permissions come from the held role,
 * never from the token; tz null means the device's zone, locale null keeps the app's language
 * (docs/34 §2).
 */
export const authMeSchema = z.object({
  id: id(),
  email: z.string().nullable(),
  role: userRoleSchema.nullable(),
  /** The token's session: a device's push registration is bound to it. */
  sessionId: z.string().nullable().optional(),
  permissions: z.array(permissionSchema),
  tz: z.string().nullable(),
  locale: z.enum(LOCALES).nullable(),
  is_test: z.boolean(),
});
export type AuthMe = z.infer<typeof authMeSchema>;
