import { z } from 'zod';

/** The refusals of the CRM webhook registration, a code each; clients word them. */
export const CRM_WEBHOOK_REFUSALS = [
  'crm_line_required',
  'crm_base_insecure',
  'public_url_required',
  'crm_key_refused',
  'crm_scope_missing',
  'crm_failed',
  'crm_bad_answer',
  'secret_store_failed',
] as const;
export const crmWebhookRefusalSchema = z.enum(CRM_WEBHOOK_REFUSALS);
export type CrmWebhookRefusal = z.infer<typeof crmWebhookRefusalSchema>;

/** The endpoint the CRM delivers to; its signing secret never leaves the server. */
export const crmWebhookResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  /** Older endpoints aimed at the same url, removed after the new one was stored. */
  replaced: z.number().int().nonnegative(),
});
export type CrmWebhookResult = z.infer<typeof crmWebhookResultSchema>;

export const crmWebhookAnswerSchema = z.object({ data: crmWebhookResultSchema });
export type CrmWebhookAnswer = z.infer<typeof crmWebhookAnswerSchema>;
