import { z } from 'zod';

// The academy CRM's webhook management API (wacrm, docs/19 «crm driver»): GET/POST {base}/webhooks,
// GET/PATCH/DELETE {base}/webhooks/{id}, scope webhooks:manage. The envelope's `data` is parsed
// here.

/** The only event the platform reads from the CRM: delivery ticks (POST /webhooks/wacrm). */
export const CRM_TICK_EVENTS = ['message.status_updated'] as const;

/** Where the CRM delivers: the API's own receiver, on the public origin. */
export const WACRM_RECEIVER_PATH = '/webhooks/wacrm';

/** One endpoint as the CRM lists it (never with its secret). */
export const crmEndpointSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  events: z.array(z.string()),
  is_active: z.boolean(),
});
export type CrmEndpoint = z.infer<typeof crmEndpointSchema>;

export const crmEndpointListSchema = z.array(crmEndpointSchema);

/** POST /webhooks 201: the endpoint plus its signing secret, shown this once only. */
export const crmCreatedSchema = crmEndpointSchema.extend({
  secret: z.string().startsWith('whsec_').min(16),
});
export type CrmCreated = z.infer<typeof crmCreatedSchema>;

/** POST /settings/integrations/crm-webhook's answer: never the secret. */
export interface CrmWebhookResult {
  id: string;
  url: string;
  events: string[];
  /** How many endpoints with the same url were removed first. */
  replaced: number;
}

/** The API's public origin (API_PUBLIC_URL): an https URL, nothing else. */
export const publicOriginSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https$/, hostname: z.regexes.domain }));
