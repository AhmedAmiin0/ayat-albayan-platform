import type { LineCheckView, WaLine } from '@ab/shared';
import { z } from 'zod';
import type { CrmLineEnv } from '../../../../config/env/env';
import { crmJson, type CrmConn } from '../drivers/crm/crm-http';
import { WaError } from '../whatsapp.types';

// «افحص الخطوط» on a crm line (docs/19 «crm driver»): one read-only GET /me with the line's key. Never a
// test message. The number, its WABA and its phone facts are the CRM's: every Meta field stays null.

/** The scope POST /messages needs. */
const CRM_SEND_SCOPE = 'messages:send';

const meSchema = z.object({ key: z.object({ scopes: z.array(z.string()) }) });

interface CrmCheckInput {
  line: WaLine;
  conn: CrmConn;
  checkedAt: string;
  /** provider, gaps, duplicate flag and whether WACRM_WEBHOOK_SECRET is set (never its value). */
  driver: Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone' | 'crm_webhook_secret'>;
}

type CallError = LineCheckView['errors'][number];

/** Does the key carry messages:send? A refused key or a failed call is an errors[] entry (scope unknown). */
async function scopeOf(conn: CrmConn): Promise<{ scope: boolean | null; error?: CallError }> {
  try {
    const me = meSchema.safeParse(await crmJson(conn, { path: 'me' }));
    if (!me.success) return { scope: null, error: { step: 'crm_me', code: null, message: 'Unexpected CRM response to GET /me' } };
    return { scope: me.data.key.scopes.includes(CRM_SEND_SCOPE) };
  } catch (e) {
    const tag = e instanceof WaError && e.info.credential ? { credential: e.info.credential } : {};
    return { scope: null, error: { step: 'crm_me', code: null, message: e instanceof Error ? e.message : String(e), ...tag } };
  }
}

/** One configured crm line: ok, the key refused (credential 'crm'), or the key without messages:send. */
export async function crmLineCheck(input: CrmCheckInput): Promise<LineCheckView> {
  const { scope, error } = await scopeOf(input.conn);
  return {
    line: input.line,
    configured: true,
    ...input.driver,
    crm_send_scope: scope,
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
