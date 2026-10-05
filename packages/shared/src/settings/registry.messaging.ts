import type { SettingDef } from './types.js';

const tpl = 'templates.settings';

/** «الرسائل والواتساب» (migrations 142, 162, 195; Phase 4 docs/12 §2) and the messaging timings. */
export const MESSAGING_SETTINGS = {
  messaging_enabled: { section: 'messaging', type: 'bool', default: false, form: false, labelKey: `${tpl}.messagingEnabled`, hintKey: `${tpl}.messagingEnabledHint` },
  auto_messages_enabled: { section: 'messaging', type: 'bool', default: false, form: false, labelKey: `${tpl}.autoMessages`, hintKey: `${tpl}.autoMessagesHint` },
  crm_cutover_done: { section: 'messaging', type: 'bool', default: false, form: false, labelKey: `${tpl}.crmDone`, hintKey: `${tpl}.crmDoneHint` },
  feedback_mode: { section: 'messaging', type: 'enum', default: 'buttons', options: ['buttons', 'link'], form: false, labelKey: `${tpl}.feedbackMode` },
  reminder_minutes_before: {
    section: 'messaging', type: 'int', default: 60, min: 5, max: 720,
    labelKey: `${tpl}.reminderMinutesBefore`, hintKey: 'settings.hints.reminderMinutesBefore',
  },
  reminder_24h_enabled: { section: 'messaging', type: 'bool', default: false, labelKey: `${tpl}.reminder24hEnabled`, hintKey: `${tpl}.reminder24hHint` },
  follow_up_hours: {
    section: 'messaging', type: 'int_list', default: [24, 72], min: 1, max: 720, maxItems: 5,
    labelKey: `${tpl}.followUpHours`, hintKey: `${tpl}.followUpHoursHint`,
  },
  /** Reminders job: how far ahead it reads lessons (≥ 25 h so the day-before send is never missed across DST). */
  reminder_lookahead_hours: {
    section: 'messaging', type: 'int', default: 25, min: 25, max: 72,
    labelKey: 'settings.reminderLookaheadHours', hintKey: 'settings.hints.reminderLookaheadHours',
  },
  /** Follow-up proposals: the first free start offered is at least this many hours ahead … */
  follow_up_slots_from_hours: {
    section: 'messaging', type: 'int', default: 12, min: 1, max: 168,
    labelKey: 'settings.followUpSlotsFromHours', hintKey: 'settings.hints.followUpSlotsFromHours',
  },
  /** … and the last within this many days. */
  follow_up_slots_to_days: {
    section: 'messaging', type: 'int', default: 7, min: 1, max: 30,
    labelKey: 'settings.followUpSlotsToDays', hintKey: 'settings.hints.followUpSlotsToDays',
  },
  /** A typed «نعم» confirms only a lesson we messaged the guardian about within this many hours. */
  quick_reply_window_hours: {
    section: 'messaging', type: 'int', default: 48, min: 1, max: 168,
    labelKey: 'settings.quickReplyWindowHours', hintKey: 'settings.hints.quickReplyWindowHours',
  },
} as const satisfies Record<string, SettingDef>;
