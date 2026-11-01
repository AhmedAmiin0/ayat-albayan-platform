import {
  BadGatewayException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { WaError } from '@/modules/messaging/whatsapp';

// The refusals of POST /settings/integrations/crm-webhook: a code each (the web words them), never
// a CRM body or a secret. 409 = this server is not set up for it; 502 = the CRM refused or
// misanswered.

export const CRM_WEBHOOK_ERRORS = {
  /** The notifications line does not send through the CRM (or lacks its base / key). */
  crm_line_required: () => new ConflictException({ message: 'crm_line_required' }),
  /** API_PUBLIC_URL is unset or not https: the CRM would have nowhere to deliver. */
  public_url_required: () => new ConflictException({ message: 'public_url_required' }),
  /** 401: the CRM refused the notifications line's key. */
  crm_key_refused: () => new BadGatewayException({ message: 'crm_key_refused' }),
  /** 403: the CRM key lacks the webhooks:manage scope. */
  crm_scope_missing: () => new BadGatewayException({ message: 'crm_scope_missing' }),
  /** Any other CRM failure (network, 4xx, 5xx). */
  crm_failed: () => new BadGatewayException({ message: 'crm_failed' }),
  /** A 2xx whose body is not what the CRM documents (a 201 without its secret among them). */
  crm_bad_answer: () => new BadGatewayException({ message: 'crm_bad_answer' }),
  /** The CRM made the endpoint but its secret could not be saved (Vault): the endpoint goes. */
  secret_store_failed: () => new InternalServerErrorException({ message: 'secret_store_failed' }),
} as const;

type CrmWebhookErrorCode = keyof typeof CRM_WEBHOOK_ERRORS;

const BY_STATUS: Partial<Record<number, CrmWebhookErrorCode>> = {
  401: 'crm_key_refused',
  403: 'crm_scope_missing',
};

/** A CRM call's failure → our refusal; one of ours passes through as it is. */
function crmRefusal(e: unknown): HttpException {
  if (e instanceof HttpException) return e;
  const status = e instanceof WaError ? e.info.status : 0;
  return CRM_WEBHOOK_ERRORS[BY_STATUS[status] ?? 'crm_failed']();
}

/** Runs one CRM step; its failure becomes a refusal (crmRefusal). */
export async function crmStep<T>(step: () => Promise<T>): Promise<T> {
  try {
    return await step();
  } catch (e) {
    throw crmRefusal(e);
  }
}
