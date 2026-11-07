import type { LineCheckView, WaLine } from '@ab/shared';
import { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import { crmJson, type CrmConn } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// «افحص الخطوط» on a crm line (docs/19 «crm driver»): one read-only GET /me with the line's key. Never a
// test message. The number, its WABA and its phone facts are the CRM's: every Meta field stays null.

/** The scope POST /messages needs. */
const CRM_SEND_SCOPE = 'messages:send';
/** The scopes «مزامنة» and «إرسال إلى ميتا» need on a crm line (docs/39). */
const CRM_TEMPLATE_SCOPES = ['templates:read', 'templates:write'] as const;

const meSchema = z.object({ key: z.object({ scopes: z.array(z.string()) }) });

interface CrmCheckInput {
  line: WaLine;
  conn: CrmConn;
  checkedAt: string;
  /** provider, gaps, duplicate flag and whether WACRM_WEBHOOK_SECRET is set (never its value). */
  driver: Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone' | 'crm_webhook_secret'>;
}

type CallError = LineCheckView['errors'][number];
type ScopeFacts = Pick<LineCheckView, 'crm_send_scope' | 'crm_template_scopes_missing'>;

/** The key's scopes (GET /me); a refused key or a failed call is an errors[] entry (scopes unknown). */
async function scopesOf(conn: CrmConn): Promise<{ scopes: string[] | null; error?: CallError }> {
  try {
    const me = meSchema.safeParse(await crmJson(conn, { path: 'me' }));
    if (!me.success) return { scopes: null, error: { step: 'crm_me', code: null, message: 'Unexpected CRM response to GET /me' } };
    return { scopes: me.data.key.scopes };
  } catch (e) {
    const tag = e instanceof WaError && e.info.credential ? { credential: e.info.credential } : {};
    return { scopes: null, error: { step: 'crm_me', code: null, message: e instanceof Error ? e.message : String(e), ...tag } };
  }
}

const UNKNOWN: ScopeFacts = { crm_send_scope: null, crm_template_scopes_missing: null };

/** messages:send, and the template scopes the key lacks; both unknown (null) when /me failed. */
const scopeFacts = (scopes: readonly string[] | null): ScopeFacts =>
  (scopes ? {
    crm_send_scope: scopes.includes(CRM_SEND_SCOPE),
    crm_template_scopes_missing: CRM_TEMPLATE_SCOPES.filter((s) => !scopes.includes(s)),
  } : UNKNOWN);

/**
 * One configured crm line: ok, the key refused (credential 'crm'), or the key without messages:send;
 * and which template scopes it lacks, from the same GET /me (no other call).
 */
export async function crmLineCheck(input: CrmCheckInput): Promise<LineCheckView> {
  const { scopes, error } = await scopesOf(input.conn);
  return {
    line: input.line,
    configured: true,
    ...input.driver,
    ...scopeFacts(scopes),
    phone_number_id: null,
    waba_id: null,
    app_id: null,
    display_phone_number: null,
    verified_name: null,
    quality_rating: null,
    status: null,
    name_status: null,
    code_verification_status: null,
    subscribed_apps: null,
    errors: error ? [error] : [],
    checked_at: input.checkedAt,
  };
}

/** The crm conn of a line env, for the check. */
export const crmConn = (env: CrmLineEnv, at: { fetch: CrmConn['fetch']; timeoutMs: number }): CrmConn => ({ env, ...at });
