import { z } from 'zod';
import { WA_LINES } from '../enums/messaging.js';
import { WA_PROVIDERS } from '../integrations/keys.js';
import { COMMS_SOURCES } from '../settings/domains/messaging.js';
import { NUMBER_SECRET_NAMES } from './views.js';

/** A Meta id (phone number, WABA, app): letters, digits, _ and -, at most 64 (wa_numbers checks). */
export const META_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const metaId = z.string().trim().regex(META_ID_RE, 'invalid_id');
export const numberLabelSchema = z.string().trim().min(1).max(60);

/** POST /admin/numbers. A new number starts disabled unless asked. */
export const numberCreateSchema = z.object({
  label: numberLabelSchema,
  purpose: z.enum(WA_LINES),
  provider: z.enum(WA_PROVIDERS).default('meta'),
  phone_number_id: metaId,
  waba_id: metaId.nullable().optional(),
  app_id: metaId.nullable().optional(),
  enabled: z.boolean().default(false),
});
export type NumberCreate = z.infer<typeof numberCreateSchema>;

/** PATCH /admin/numbers/:id: any subset; is_default true makes it its role's default (enabled only). */
export const numberUpdateSchema = z
  .object({
    label: numberLabelSchema,
    purpose: z.enum(WA_LINES),
    provider: z.enum(WA_PROVIDERS),
    phone_number_id: metaId,
    waba_id: metaId.nullable(),
    app_id: metaId.nullable(),
    enabled: z.boolean(),
    is_default: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'empty');
export type NumberUpdate = z.infer<typeof numberUpdateSchema>;

export const numberSecretNameSchema = z.enum(NUMBER_SECRET_NAMES);
/** PUT /admin/numbers/:id/secrets/:name. */
export const numberSecretSchema = z.object({ value: z.string().trim().min(1).max(4096) });

/** POST /admin/numbers/import. */
export const numbersImportSchema = z.object({ dryRun: z.boolean() });

/** POST /admin/communications/source. */
export const commsSourceSchema = z.object({ source: z.enum(COMMS_SOURCES) });

/** The 409 reasons of the numbers endpoints (shown in words by the web). */
export const NUMBER_ERRORS = ['parity_not_empty', 'phone_taken', 'default_taken', 'number_enabled', 'not_enabled'] as const;
export type NumberError = (typeof NUMBER_ERRORS)[number];
export const isNumberError = (code: unknown): code is NumberError => NUMBER_ERRORS.some((c) => c === code);
