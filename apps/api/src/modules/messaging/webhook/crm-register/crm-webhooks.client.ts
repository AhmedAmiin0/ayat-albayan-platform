import { crmJson, type CrmConn } from '@/modules/messaging/whatsapp';
import { CRM_WEBHOOK_ERRORS } from './crm-webhook.errors';
import {
  CRM_TICK_EVENTS,
  crmCreatedSchema,
  crmEndpointListSchema,
  crmEndpointSchema,
  publicOriginSchema,
  WACRM_RECEIVER_PATH,
  type CrmCreated,
  type CrmEndpoint,
} from './crm-webhook.schemas';

// The CRM's webhook endpoints over its public API (crmJson: Bearer key, timeout, envelope →
// WaError). A body that does not parse is crm_bad_answer, never a ZodError: no CRM body (a secret)
// is ever echoed.

/** <API_PUBLIC_URL's origin>/webhooks/wacrm, built with URL; null unless the origin is https. */
export function receiverUrl(publicUrl: string | undefined): string | null {
  const origin = publicOriginSchema.safeParse(publicUrl ?? '');
  if (!origin.success) return null;
  return new URL(WACRM_RECEIVER_PATH, new URL(origin.data).origin).toString();
}

/** GET {base}/webhooks: every endpoint of the key's account. */
export async function listEndpoints(conn: CrmConn): Promise<CrmEndpoint[]> {
  const parsed = crmEndpointListSchema.safeParse(await crmJson(conn, { path: 'webhooks' }));
  if (!parsed.success) throw CRM_WEBHOOK_ERRORS.crm_bad_answer();
  return parsed.data;
}

/** DELETE {base}/webhooks/{id}. */
export async function deleteEndpoint(conn: CrmConn, id: string): Promise<void> {
  await crmJson(conn, { path: `webhooks/${encodeURIComponent(id)}`, method: 'DELETE' });
}

/**
 * POST {base}/webhooks for the delivery ticks only. A 201 without its secret (or with a malformed
 * one) is useless: the endpoint it names is removed (best effort) and the call fails as
 * crm_bad_answer.
 */
export async function createEndpoint(conn: CrmConn, url: string): Promise<CrmCreated> {
  const body = { url, events: [...CRM_TICK_EVENTS] };
  const data = await crmJson(conn, { path: 'webhooks', method: 'POST', body });
  const created = crmCreatedSchema.safeParse(data);
  if (created.success) return created.data;
  const orphan = crmEndpointSchema.safeParse(data);
  if (orphan.success) await deleteEndpoint(conn, orphan.data.id).catch(() => undefined);
  throw CRM_WEBHOOK_ERRORS.crm_bad_answer();
}
