import type { CrmWebhookAnswer } from '@ab/shared';

export interface CrmWebhookCalls {
  register: () => Promise<CrmWebhookAnswer>;
}
