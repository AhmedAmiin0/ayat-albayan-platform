import type { WaLine } from '../enums/messaging.js';
import type { WaProvider } from '../integrations/keys.js';

/**
 * POST /messaging/lines/check item (docs/12 §13.8–13.9): one WhatsApp line as Meta reports it.
 * Carries ids and URLs only, NEVER tokens or secrets. An unconfigured line has every field null.
 */
export interface LineCheckView {
  line: WaLine;
  configured: boolean;
  /** The line's driver (WA_PROVIDER / WA_CHAT_PROVIDER, docs/19): Meta directly, Kapso or the academy CRM. */
  provider: WaProvider;
  /** NAMES (never values) of the keys this line still lacks to send under its provider; [] = none. */
  gaps: string[];
  /** The chat line's phone id is the notifications one, so the chat line is off (shown in words, not as a key). */
  duplicate_chat_phone: boolean;
  /** kapso lines only: is KAPSO_WEBHOOK_SECRET set (a boolean, never the value)? false = every inbound is refused. */
  kapso_webhook_secret?: boolean;
  /** crm lines only (docs/19): is WACRM_WEBHOOK_SECRET set (never the value)? false = no delivery ticks arrive. */
  crm_webhook_secret?: boolean;
  /** crm lines only: does the CRM key carry messages:send (GET /me)? null = not known (the call failed). */
  crm_send_scope?: boolean | null;
  phone_number_id: string | null;
  waba_id: string | null;
  /** The line's OWN Meta app id from env (WA_APP_ID / WA_CHAT_APP_ID): an id, not a secret. */
  app_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_rating: string | null;
  status: string | null;
  name_status: string | null;
  code_verification_status: string | null;
  /** null = not asked / the call failed; [] = no app subscribed to the WABA (no webhook arrives). */
  subscribed_apps: { id: string | null; name: string | null; override_callback_uri: string | null }[] | null;
  /**
   * One entry per failed call (phone first, then subscribed_apps; a crm line's only call is crm_me = GET /me);
   * `credential: 'kapso'` = Kapso refused its key, `'crm'` = the CRM refused its key.
   */
  errors: { step: 'phone' | 'subscribed_apps' | 'crm_me'; code: number | null; message: string; credential?: 'kapso' | 'crm' }[];
  checked_at: string;
}
