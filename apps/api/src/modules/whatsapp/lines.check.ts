import { WA_LINES, type LineCheckView, type WaLine } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { duplicatePhone, lineEnvs, lineGaps, lineProvider, loadEnv, type WhatsappEnv } from '../../env';
import { graphJson, type FetchLike, type GraphConn } from './graph';
import { crmConn, crmLineCheck } from './lines.check.crm';
import { parsed, phoneNumberSchema, subscribedAppsSchema } from './meta-shapes';
import { WaError } from './whatsapp.types';

type Phone = Pick<
  LineCheckView,
  'display_phone_number' | 'verified_name' | 'quality_rating' | 'status' | 'name_status' | 'code_verification_status'
>;
type Apps = NonNullable<LineCheckView['subscribed_apps']>;
type Step = LineCheckView['errors'][number]['step'];
type Outcome<T> = { ok: true; value: T } | { ok: false; error: LineCheckView['errors'][number] };

export const PHONE_FIELDS = 'display_phone_number,verified_name,quality_rating,status,name_status,code_verification_status';

const NO_PHONE: Phone = {
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
};

interface LineInput {
  line: WaLine;
  env: WhatsappEnv | null;
  appId: string | null;
  checkedAt: string;
  /** The line's driver, the NAMES of what it still lacks, a duplicate chat id, whether Kapso can deliver inbound (docs/19). */
  driver: Pick<LineCheckView, 'provider' | 'gaps' | 'duplicate_chat_phone' | 'kapso_webhook_secret' | 'crm_webhook_secret'>;
}

/** A rejected call becomes an errors[] entry; it never hides the other call or line. */
async function attempt<T>(step: Step, call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (e) {
    const code = e instanceof WaError ? e.info.code : null;
    const tag = e instanceof WaError && e.info.credential ? { credential: e.info.credential } : {};
    return { ok: false, error: { step, code, message: e instanceof Error ? e.message : String(e), ...tag } };
  }
}

async function phoneOf(conn: GraphConn): Promise<Phone> {
  const path = `${encodeURIComponent(conn.env.phoneNumberId)}?fields=${PHONE_FIELDS}`;
  const p = parsed(phoneNumberSchema, await graphJson(conn, { path }));
  return {
    display_phone_number: p.display_phone_number ?? null,
    verified_name: p.verified_name ?? null,
    quality_rating: p.quality_rating ?? null,
    status: p.status ?? null,
    name_status: p.name_status ?? null,
    code_verification_status: p.code_verification_status ?? null,
  };
}

async function appsOf(conn: GraphConn): Promise<Apps> {
  const path = `${encodeURIComponent(conn.env.wabaId)}/subscribed_apps`;
  const body = parsed(subscribedAppsSchema, await graphJson(conn, { path }));
  return body.data.map(({ whatsapp_business_api_data: a, override_callback_uri: uri }) => ({
    id: a?.id ?? null,
    name: a?.name ?? null,
    override_callback_uri: uri ?? a?.override_callback_uri ?? null,
  }));
}

/**
 * POST /messaging/lines/check (docs/12 §13.9): two read-only Graph GETs per configured line, both
 * lines and both calls at once, through each line's driver (a crm line: GET /me only, lines.check.crm.ts). Ids, URLs and key NAMES only: the
 * result never carries a token, key or secret.
 */
@Injectable()
export class LinesCheck {
  /** Overridable in tests. */
  fetch: FetchLike = fetch;
  timeoutMs = 8000;

  async check(): Promise<LineCheckView[]> {
    const env = loadEnv();
    const envs = lineEnvs(env);
    const checkedAt = new Date().toISOString();
    const appIds: Record<WaLine, string | undefined> = { notifications: env.WA_APP_ID, chat: env.WA_CHAT_APP_ID };
    return Promise.all(
      WA_LINES.map((line) => {
        const provider = lineProvider(env, line);
        const base = { provider, gaps: lineGaps(env, line), duplicate_chat_phone: duplicatePhone(env, line) };
        const driver: LineInput['driver'] =
          provider === 'kapso'
            ? { ...base, kapso_webhook_secret: env.KAPSO_WEBHOOK_SECRET !== undefined }
            : provider === 'crm'
              ? { ...base, crm_webhook_secret: env.WACRM_WEBHOOK_SECRET !== undefined }
              : base;
        const appId = provider === 'meta' ? (appIds[line] ?? null) : null;
        return this.one({ line, env: envs[line], appId, checkedAt, driver });
      }),
    );
  }

  private async one(input: LineInput): Promise<LineCheckView> {
    const { line, env, checkedAt } = input;
    if (!env) return { ...unconfigured(line, checkedAt), ...input.driver };
    // A crm line: GET /me only (docs/19); the number is the CRM's, so no Graph call at all.
    if (env.provider === 'crm') return crmLineCheck({ line, conn: crmConn(env, this), checkedAt, driver: input.driver });
    const conn: GraphConn = { env, fetch: this.fetch, timeoutMs: this.timeoutMs };
    // Kapso's Meta proxy has no /{waba}/subscribed_apps (404 on staging, 2026-10-18): its inbound comes
    // through the Kapso webhook, so a kapso line is not asked (subscribed_apps stays null).
    const kapso = input.driver.provider === 'kapso';
    const [phone, apps] = await Promise.all([
      attempt('phone', () => phoneOf(conn)),
      kapso ? null : attempt('subscribed_apps', () => appsOf(conn)),
    ]);
    const errors = [phone, apps].flatMap((o) => (o && !o.ok ? [o.error] : []));
    return {
      line,
      configured: true,
      ...input.driver,
      phone_number_id: env.phoneNumberId,
      waba_id: env.wabaId,
      app_id: input.appId,
      ...(phone.ok ? phone.value : NO_PHONE),
      subscribed_apps: apps?.ok ? apps.value : null,
      errors,
      checked_at: checkedAt,
    };
  }
}

function unconfigured(line: WaLine, checkedAt: string): LineCheckView {
  return {
    line,
    configured: false,
    provider: 'meta',
    gaps: [],
    duplicate_chat_phone: false,
    phone_number_id: null,
    waba_id: null,
    app_id: null,
    ...NO_PHONE,
    subscribed_apps: null,
    errors: [],
    checked_at: checkedAt,
  };
}
