import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { integrationsQuery, registerCrmWebhook } from './integrations-api';

const s = t.integrations.crmWebhook;

/** The refusals of POST /settings/integrations/crm-webhook, as codes (api crm-webhook.errors). */
const CODES = [
  'crm_line_required',
  'public_url_required',
  'crm_key_refused',
  'crm_scope_missing',
  'crm_failed',
  'crm_bad_answer',
  'secret_store_failed',
] as const;
const refusalSchema = z.object({ message: z.enum(CODES) });
const answerSchema = z.object({
  data: z.object({
    id: z.string(),
    url: z.string(),
    events: z.array(z.string()),
    replaced: z.number(),
  }),
});
type CrmWebhookAnswer = z.infer<typeof answerSchema>['data'];

/** The API's refusal in words; anything else is «try again». */
export function crmWebhookProblem(e: unknown): string {
  const parsed = refusalSchema.safeParse(e instanceof ApiError ? e.body : null);
  return parsed.success ? s.errors[parsed.data.message] : s.errors.unknown;
}

/**
 * «ربط علامات التسليم من CRM تلقائيًا»: registers the CRM's delivery-ticks webhook; the secret
 * stays on the server. After it, «التكاملات» is read again (WACRM_WEBHOOK_SECRET now saved).
 */
export function useCrmWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CrmWebhookAnswer> =>
      answerSchema.parse(await registerCrmWebhook()).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationsQuery.queryKey }),
  });
}
