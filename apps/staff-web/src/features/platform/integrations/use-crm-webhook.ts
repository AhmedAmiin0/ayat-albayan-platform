import { crmWebhookRefusalSchema, type CrmWebhookResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, t } from '@ab/web-kit';
import { integrationsQuery, registerCrmWebhook } from './integrations-api';

const s = t.integrations.crmWebhook;

const refusalSchema = z.object({ message: crmWebhookRefusalSchema });

/** The API's refusal in words; anything else is «try again». */
export function crmWebhookProblem(e: unknown): string {
  const parsed = refusalSchema.safeParse(e instanceof ApiError ? e.body : null);
  return parsed.success ? s.errors[parsed.data.message] : s.errors.unknown;
}

/** The webhook secret stays on the server. */
export function useCrmWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CrmWebhookResult> => (await registerCrmWebhook()).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationsQuery.queryKey }),
  });
}
