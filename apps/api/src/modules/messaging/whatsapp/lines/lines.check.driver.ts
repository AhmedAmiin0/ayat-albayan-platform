import type { LineCheckView, WaLine, WaProvider } from '@ab/shared';
import { duplicatePhone, lineGaps, lineProvider, type Env } from '@/config/env/env';

// A line's driver part of POST /messaging/lines/check: the driver, the NAMES of what it still
// lacks, a duplicate chat id, and whether the driver can take inbound (docs/19).

export type LineDriver = Pick<
  LineCheckView,
  'provider' | 'gaps' | 'duplicate_chat_phone' | 'kapso_webhook_secret' | 'crm_webhook_secret'
>;

type Extras = Pick<LineDriver, 'kapso_webhook_secret' | 'crm_webhook_secret'>;

/** Per driver: its inbound secret is set (a meta line has nothing to add). */
const DRIVER_EXTRAS = {
  meta: () => ({}),
  kapso: (env) => ({ kapso_webhook_secret: env.KAPSO_WEBHOOK_SECRET !== undefined }),
  crm: (env) => ({ crm_webhook_secret: env.WACRM_WEBHOOK_SECRET !== undefined }),
} satisfies Record<WaProvider, (env: Env) => Extras>;

export function driverOf(env: Env, line: WaLine): LineDriver {
  const provider = lineProvider(env, line);
  const gaps = lineGaps(env, line);
  const base = { provider, gaps, duplicate_chat_phone: duplicatePhone(env, line) };
  return { ...base, ...DRIVER_EXTRAS[provider](env) };
}
