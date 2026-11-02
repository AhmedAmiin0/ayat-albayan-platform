import { integrationSecretSchema } from '@ab/shared';
import { z } from 'zod';

// The academy CRM's webhook management API (wacrm, docs/19 «crm driver»): GET/POST {base}/webhooks,
// GET/PATCH/DELETE {base}/webhooks/{id}, scope webhooks:manage. The envelope's `data` is parsed
// here.

/** The only event the platform reads from the CRM: delivery ticks (POST /webhooks/wacrm). */
export const CRM_TICK_EVENTS = ['message.status_updated'] as const;

/** Where the CRM delivers: the API's own receiver, on the public origin. */
export const WACRM_RECEIVER_PATH = '/webhooks/wacrm';

/**
 * One endpoint as the CRM lists it (never with its secret). wacrm's ids are uuids
 * (webhook_endpoints.id, migration 028): anything else is refused before a path or a log.
 */
export const crmEndpointSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  events: z.array(z.string()),
  is_active: z.boolean(),
});
export type CrmEndpoint = z.infer<typeof crmEndpointSchema>;

export const crmEndpointListSchema = z.array(crmEndpointSchema);

/**
 * The signing secret wacrm shows once: «whsec_» + base64url. Trimmed and bounded like the
 * «التكاملات» secrets PUT, so what is stored is exactly what the env loader reads back.
 */
const crmSecretSchema = integrationSecretSchema.shape.value.pipe(
  z.string().regex(/^whsec_[A-Za-z0-9_-]{16,}$/),
);

/** POST /webhooks 201: the endpoint plus its signing secret, shown this once only. */
export const crmCreatedSchema = crmEndpointSchema.extend({ secret: crmSecretSchema });
export type CrmCreated = z.infer<typeof crmCreatedSchema>;

/** POST /settings/integrations/crm-webhook's answer: never the secret. */
export interface CrmWebhookResult {
  id: string;
  url: string;
  events: string[];
  /** How many older endpoints aimed at the same url were removed after the new one was stored. */
  replaced: number;
}

/** The API's public origin (API_PUBLIC_URL): https on a domain, no path, nothing else. */
export const publicOriginSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https$/, hostname: z.regexes.domain }))
  .refine((raw) => URL.canParse(raw) && new URL(raw).pathname === '/', 'origin_only');

/** The notifications line's CRM base: https only (the key travels as a Bearer). */
export const crmBaseSchema = z.url({ protocol: /^https$/ });
