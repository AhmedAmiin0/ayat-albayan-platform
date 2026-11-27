import { crmWebhookRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CrmWebhookCalls } from './crm-webhook-api.types';

/** The CRM webhook registration, on one api client. */
export function crmWebhookCalls(client: ApiClient): CrmWebhookCalls {
  const call = callWith(client);
  return {
    register: () => call({ route: crmWebhookRoutes.register }),
  };
}
