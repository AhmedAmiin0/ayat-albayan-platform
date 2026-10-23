import type { SettingDef } from '../defs.js';

const tpl = 'templates.settings';

/** «الرسائل والواتساب» (migrations 142, 162; Phase 4 docs/12 §2): the sending switches and the quick-reply window. */
export const MESSAGING_SETTINGS = {
  messaging_enabled: { type: 'bool', default: false, form: false, labelKey: `${tpl}.messagingEnabled`, hintKey: `${tpl}.messagingEnabledHint` },
  auto_messages_enabled: { type: 'bool', default: false, form: false, labelKey: `${tpl}.autoMessages`, hintKey: `${tpl}.autoMessagesHint` },
  crm_cutover_done: { type: 'bool', default: false, form: false, labelKey: `${tpl}.crmDone`, hintKey: `${tpl}.crmDoneHint` },
  /** A typed «نعم» confirms only a lesson we messaged the guardian about within this many hours. */
  quick_reply_window_hours: {
    type: 'int', default: 48, min: 1, max: 168,
    labelKey: 'settings.quickReplyWindowHours', hintKey: 'settings.hints.quickReplyWindowHours',
  },
} as const satisfies Record<string, SettingDef>;
