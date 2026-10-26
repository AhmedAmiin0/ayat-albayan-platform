import type { FailurePlan } from '../../sender/send-plan';
import type { WaError } from '../../whatsapp.types';

/** messages.error_code while the CRM's rate limit (429) holds the row until its Retry-After. */
export const CRM_RATE_LIMITED = 'crm_rate_limited';

export interface CrmPlanInput {
  info: WaError['info'] | null;
  /** This try included (the claim's +1). */
  attempts: number;
  now: Date;
  error_text: string;
  /** errorCode(error): crm_<code>. */
  error_code: string;
}

/**
 * The crm driver's own outcomes (docs/19), after the uncertain and auth checks: a 429 waits for its
 * Retry-After with the try not counted (not the message's fault); any other CRM code (meta_error,
 * template_malformed, a 4xx) fails at once: nothing was sent and the same body fails again. null = not a CRM answer.
 */
export function crmPlan(c: CrmPlanInput): FailurePlan | null {
  if (!c.info) return null;
  const { retryAfterMs, crmCode } = c.info;
  if (retryAfterMs) {
    const next_attempt_at = new Date(c.now.getTime() + retryAfterMs).toISOString();
    return { status: 'queued', next_attempt_at, error_code: CRM_RATE_LIMITED, error_text: c.error_text, attempts: Math.max(0, c.attempts - 1) };
  }
  return crmCode ? { status: 'failed', next_attempt_at: null, error_code: c.error_code, error_text: c.error_text } : null;
}
