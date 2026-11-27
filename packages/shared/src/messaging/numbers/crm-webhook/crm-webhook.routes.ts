import { defineRoute } from '@ab/core';
import { crmWebhookAnswerSchema } from './crm-webhook.schemas';

/** The CRM's delivery-ticks webhook, registered from the integrations page (docs/19). */
export const crmWebhookRoutes = {
  /** 200; the same permission as the secrets PUT; 409 or 502 with a refusal code. */
  register: defineRoute({
    method: 'POST',
    path: '/settings/integrations/crm-webhook',
    response: crmWebhookAnswerSchema,
    permissions: ['settings.write'],
    tags: ['settings'],
  }),
};
