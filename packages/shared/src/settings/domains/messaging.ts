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
} as const satisfies Record<string, SettingDef>;
