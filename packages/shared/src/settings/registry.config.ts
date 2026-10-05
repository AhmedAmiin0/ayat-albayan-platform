import type { SettingDef } from './types.js';

/**
 * Custom-config request (2026-10-05): the public contact and consent notice, and data retention.
 * The consent notice and the recording retention have no consumer yet (the recordings PR adds them). Retention of recordings is OFF (null = keep forever):
 * deleting them is the owner's decision, never on by default.
 */
export const CONFIG_SETTINGS = {
  /**
   * Printed in the footer of every lesson report (a missing site keeps the built-in one). The
   * WhatsApp number is academy_whatsapp_e164 (one source), not a field here.
   */
  academy_contact: {
    section: 'academy', type: 'json', default: { site: 'ayatalbayan.com' }, public: true,
    shape: [
      { name: 'site', kind: 'string', format: 'host', max: 100 },
      { name: 'email', kind: 'string', format: 'email', max: 120 },
    ],
    labelKey: 'config.academyContact', hintKey: 'config.academyContactHint',
  },
  recording_consent_notice: {
    section: 'academy', type: 'json', default: null, nullable: true, public: true,
    shape: [{ name: 'ar', kind: 'text', max: 1000 }, { name: 'en', kind: 'text', max: 1000 }],
    labelKey: 'config.recordingConsentNotice', hintKey: 'config.recordingConsentNoticeHint',
  },
  /** null = keep recordings forever (the default). */
  recording_retention_days: {
    section: 'academy', type: 'int', default: null, min: 1, max: 3650, nullable: true, onValue: 90,
    labelKey: 'config.recordingRetentionDays',
    toggleLabelKey: 'config.recordingRetentionOn', toggleHintKey: 'config.recordingRetentionHint',
  },
  /** Read by prune_activity_log() (migration 20261005000250); the old fixed value was 180. */
  activity_retention_days: {
    section: 'academy', type: 'int', default: 180, min: 1, max: 3650,
    labelKey: 'config.activityRetentionDays', hintKey: 'config.activityRetentionDaysHint',
  },
} as const satisfies Record<string, SettingDef>;
