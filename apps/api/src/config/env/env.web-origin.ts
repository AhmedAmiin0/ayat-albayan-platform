import { z } from 'zod';

const ORIGIN = /^https?:\/\/[^/\s,]+\/*$/;

/**
 * WEB_ORIGIN: a comma list of the web apps' origins, the staff app (app.) FIRST, the family web
 * app after it (docs/51 §4). Links in messages use the first, so it must be an http(s) origin
 * (a leading comma or a bare host fails the boot).
 */
export const webOrigin = z
  .string()
  .default('http://localhost:5173')
  .refine((v) => ORIGIN.test((v.split(',')[0] ?? '').trim()), {
    message: 'WEB_ORIGIN: the first entry must be an http(s) origin',
  });
