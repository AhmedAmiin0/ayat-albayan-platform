import type { RouteQuery } from '@ab/core';
import type {
  RegistrationCheckBy,
  RegistrationCheckCode,
  registrationCheckRoutes,
} from '@ab/shared';

/** The query of GET /sales/registration-check: a phone in E.164 or a name / code. */
export type RegistrationAsk = RouteQuery<(typeof registrationCheckRoutes)['check']>;

export type CheckRequest =
  | { ok: true; by: RegistrationCheckBy; query: RegistrationAsk }
  | { ok: false; code: RegistrationCheckCode };
