import type { CrmLineEnv } from '../../env';

// Test-only (excluded from the build). A line on the academy CRM's REST API (docs/19 «crm driver») pointed
// at tools/wa-stub's crm prefix, and the CRM's answers. Ids and keys invented.

export const CRM_ENV: CrmLineEnv = { provider: 'crm', base: 'http://127.0.0.1:4010/crm/api/v1', apiKey: 'fake-crm-key' };

/** POST /messages 201. */
export const CRM_SENT = {
  status: 201,
  body: { data: { message_id: 'm-1', whatsapp_message_id: 'wamid.crm-1', conversation_id: 'c-1', contact_id: 'p-1', contact_created: false } },
};

/** The CRM's failure envelope. */
export const crmFailure = (status: number, code: string, message = `${code} message`) => ({ status, body: { error: { code, message } } });
