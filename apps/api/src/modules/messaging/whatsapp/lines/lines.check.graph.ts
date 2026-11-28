import type { LineCheckView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import type { GraphEnv } from '@/config/env/env';
import { graphHttp, type GraphConn } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { phoneNumberSchema, subscribedAppsSchema } from '@/modules/messaging/whatsapp/drivers/meta/meta-shapes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { LineDriver } from './lines.check.driver';

type Phone = Pick<
  LineCheckView,
  | 'display_phone_number'
  | 'verified_name'
  | 'quality_rating'
  | 'status'
  | 'name_status'
  | 'code_verification_status'
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

const orNull = (value: string | undefined): string | null => value ?? null;

/** A rejected call becomes an errors[] entry; it never hides the other call or line. */
async function attempt<T>(step: Step, call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (e) {
    const code = e instanceof WaError ? e.info.code : null;
    const tag = e instanceof WaError && e.info.credential ? { credential: e.info.credential } : {};
    return {
      ok: false,
      error: { step, code, message: e instanceof Error ? e.message : String(e), ...tag },
    };
  }
}

async function phoneOf(conn: GraphConn): Promise<Phone> {
  const path = `${encodeURIComponent(conn.env.phoneNumberId)}?fields=${PHONE_FIELDS}`;
  const p = await graphHttp(conn).json({ path, schema: phoneNumberSchema });
  return {
    display_phone_number: orNull(p.display_phone_number),
    verified_name: orNull(p.verified_name),
    quality_rating: orNull(p.quality_rating),
    status: orNull(p.status),
    name_status: orNull(p.name_status),
    code_verification_status: orNull(p.code_verification_status),
  };
}

export async function appsOf(conn: GraphConn): Promise<Apps> {
  const path = `${encodeURIComponent(conn.env.wabaId)}/subscribed_apps`;
  const body = await graphHttp(conn).json({ path, schema: subscribedAppsSchema });
  return body.data.map(({ whatsapp_business_api_data: a, override_callback_uri: uri }) => ({
    id: orNull(a?.id),
    name: orNull(a?.name),
    override_callback_uri: orNull(uri ?? a?.override_callback_uri),
  }));
}

/**
 * Kapso's Meta proxy has no /{waba}/subscribed_apps (a 404): its inbound comes through the Kapso
 * webhook, so a kapso line is not asked (subscribed_apps stays null).
 */
const askApps = (driver: LineDriver, conn: GraphConn): Promise<Outcome<Apps>> | null =>
  driver.provider === 'kapso' ? null : attempt('subscribed_apps', () => appsOf(conn));

interface GraphInput {
  line: WaLine;
  env: GraphEnv;
  appId: string | null;
  checkedAt: string;
  driver: LineDriver;
}

/** Two read-only Graph GETs at once: the phone and the WABA's subscribed apps. */
export async function graphCheck(input: GraphInput, conn: GraphConn): Promise<LineCheckView> {
  const [phone, apps] = await Promise.all([
    attempt('phone', () => phoneOf(conn)),
    askApps(input.driver, conn),
  ]);
  const errors = [phone, apps].flatMap((o) => (o && !o.ok ? [o.error] : []));
  return {
    line: input.line,
    configured: true,
    ...input.driver,
    phone_number_id: input.env.phoneNumberId,
    waba_id: input.env.wabaId,
    app_id: input.appId,
    ...(phone.ok ? phone.value : NO_PHONE),
    subscribed_apps: apps?.ok ? apps.value : null,
    errors,
    checked_at: input.checkedAt,
  };
}

export function unconfigured(line: WaLine, checkedAt: string): LineCheckView {
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
