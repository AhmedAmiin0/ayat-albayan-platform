import type { SettingDef } from '../defs.js';

const tpl = 'templates.settings';

/** Where the WhatsApp line config comes from (docs/23 §2e): today's keys, or the numbers' records. */
export const COMMS_SOURCES = ['legacy', 'module'] as const;
export type CommsSource = (typeof COMMS_SOURCES)[number];

/** «الرسائل والواتساب» (migrations 142, 162; Phase 4 docs/12 §2): the sending switches and the quick-reply window. */
export const MESSAGING_SETTINGS = {
  messaging_enabled: {
    module: 'messaging', group: 'safety', ownedBy: 'messages_gate', reachesFamilies: true,
    type: 'bool', default: false, form: false, labelKey: `${tpl}.messagingEnabled`, hintKey: `${tpl}.messagingEnabledHint`,
  },
  auto_messages_enabled: {
    module: 'messaging', group: 'safety', ownedBy: 'messages_gate', reachesFamilies: true,
    type: 'bool', default: false, form: false, labelKey: `${tpl}.autoMessages`, hintKey: `${tpl}.autoMessagesHint`,
  },
  crm_cutover_done: {
    module: 'messaging', group: 'safety', ownedBy: 'messages_gate',
    type: 'bool', default: false, form: false, labelKey: `${tpl}.crmDone`, hintKey: `${tpl}.crmDoneHint`,
  },
  /**
   * legacy = the WA_* integration keys (default; an unknown or malformed row reads as legacy); module =
   * each role's default number (wa_numbers). Seeded by migration 20261023000620. Never written by PATCH
   * /settings: only POST /admin/communications/source, which refuses `module` while parity differs.
   */
  comms_source: {
    module: 'messaging', group: 'safety', ownedBy: 'communications', reachesFamilies: true,
    type: 'enum', default: 'legacy', options: COMMS_SOURCES, form: false, patch: false,
    labelKey: 'settings.commsSource', hintKey: 'settings.hints.commsSource',
  },
  /**
   * In-app WhatsApp voice calls from the chat number (docs/28), built dark: false hides the phone icon
   * and every /calls route answers 404. The owner turns it on after the Kapso / Meta steps of docs/28 §7.
   */
  whatsapp_calls_enabled: {
    module: 'messaging', group: 'messaging', confirm: 'simple', reachesFamilies: true,
    type: 'bool', default: false, labelKey: 'calls.settings.enabled', hintKey: 'calls.settings.enabledHint',
  },
  /** A typed «نعم» confirms only a lesson we messaged the guardian about within this many hours. */
  quick_reply_window_hours: {
    module: 'messaging', group: 'messaging', reachesFamilies: true,
    type: 'int', default: 48, min: 1, max: 168,
    labelKey: 'settings.quickReplyWindowHours', hintKey: 'settings.hints.quickReplyWindowHours',
  },
  /**
   * The template a closed chat's open queues (POST /threads/:phone/reopen; owner 2026-10-26: v2, and
   * no fallback while it is not approved: Kapso's reopen only, answer template_unavailable).
   */
  chat_reopen_template: {
    module: 'messaging', group: 'messaging', reachesFamilies: true,
    type: 'string', default: 'inquiry_followup_ar_v2', minLength: 1, maxLength: 512,
    labelKey: 'settings.chatReopenTemplate', hintKey: 'settings.hints.chatReopenTemplate',
  },
  /**
   * The old CRM's storage host (owner 2026-10-27): a photo or voice note imported from it is fetched
   * from this host once and cached (InboundMedia). Empty (the seed) = off: such a file is 410. The
   * value is the academy's own and never lives in the repo; the API checks the host exactly.
   */
  crm_media_host: {
    module: 'messaging', group: 'messaging',
    type: 'string', default: '', minLength: 0, maxLength: 100,
    labelKey: 'settings.crmMediaHost', hintKey: 'settings.hints.crmMediaHost',
  },
  /**
   * Owner 2026-10-27: while true (and crm_media_host is set), the API copies EVERY imported old-CRM
   * file into wa-media in small batches (CrmMediaCopyJob), not only those an admin opens; it turns
   * itself back off when none is left. Then the old CRM's chat-media bucket may be made private.
   */
  crm_media_copy_all: {
    module: 'messaging', group: 'messaging', confirm: 'simple',
    type: 'bool', default: false, labelKey: 'settings.crmMediaCopyAll', hintKey: 'settings.hints.crmMediaCopyAll',
  },
} as const satisfies Record<string, SettingDef>;
