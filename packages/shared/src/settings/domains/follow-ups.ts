import type { SettingDef } from '../defs.js';

const tpl = 'templates.settings';

/** Lead follow-ups (R-LEAD-05): when they are sent, and which free starts they propose. */
export const FOLLOW_UP_SETTINGS = {
  follow_up_hours: {
    module: 'follow_ups', group: 'notifications', ownedBy: 'notifications', reachesFamilies: true,
    type: 'int_list', default: [24, 72], min: 1, max: 720, maxItems: 5,
    labelKey: `${tpl}.followUpHours`, hintKey: `${tpl}.followUpHoursHint`,
  },
  /** Follow-up proposals: the first free start offered is at least this many hours ahead … */
  follow_up_slots_from_hours: {
    module: 'follow_ups', group: 'notifications', ownedBy: 'notifications', reachesFamilies: true,
    type: 'int', default: 12, min: 1, max: 168,
    labelKey: 'settings.followUpSlotsFromHours', hintKey: 'settings.hints.followUpSlotsFromHours',
  },
  /** … and the last within this many days. */
  follow_up_slots_to_days: {
    module: 'follow_ups', group: 'notifications', ownedBy: 'notifications', reachesFamilies: true,
    type: 'int', default: 7, min: 1, max: 30,
    labelKey: 'settings.followUpSlotsToDays', hintKey: 'settings.hints.followUpSlotsToDays',
  },
} as const satisfies Record<string, SettingDef>;
