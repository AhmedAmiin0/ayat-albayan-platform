import type { SettingDef } from '../defs.js';

const tpl = 'templates.settings';
const h = 'settings.hints';

/** Lesson feedback: how it is asked for (migration 195) and the public form's rate limit. */
export const FEEDBACK_SETTINGS = {
  feedback_mode: { module: 'feedback', group: 'notifications', ownedBy: 'notifications', reachesFamilies: true, type: 'enum', default: 'buttons', options: ['buttons', 'link'], form: false, labelKey: `${tpl}.feedbackMode` },
  feedback_rate_window_min: {
    module: 'feedback', group: 'academy', reachesFamilies: true,
    type: 'int', default: 10, min: 1, max: 120,
    labelKey: 'settings.feedbackRateWindowMin', hintKey: `${h}.feedbackRateWindowMin`,
  },
} as const satisfies Record<string, SettingDef>;

/** 'buttons' = lesson_rating after a completed lesson; 'link' = no automatic message (migration 195). */
export const FEEDBACK_MODES = FEEDBACK_SETTINGS.feedback_mode.options;
export type FeedbackMode = (typeof FEEDBACK_MODES)[number];
