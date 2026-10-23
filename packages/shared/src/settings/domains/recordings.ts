import type { SettingDef } from '../defs.js';

/**
 * Custom-config request (2026-10-05): the recording consent notice and the recordings' retention.
 * The consent notice and the recording retention have no consumer yet (the recordings PR adds them). Retention of recordings is OFF (null = keep forever):
 * deleting them is the owner's decision, never on by default.
 */
export const RECORDING_SETTINGS = {
  recording_consent_notice: {
    type: 'json', default: null, nullable: true, public: true,
    shape: [{ name: 'ar', kind: 'text', max: 1000 }, { name: 'en', kind: 'text', max: 1000 }],
    labelKey: 'config.recordingConsentNotice', hintKey: 'config.recordingConsentNoticeHint',
  },
  /** null = keep recordings forever (the default). */
  recording_retention_days: {
    type: 'int', default: null, min: 1, max: 3650, nullable: true, onValue: 90,
    labelKey: 'config.recordingRetentionDays',
    toggleLabelKey: 'config.recordingRetentionOn', toggleHintKey: 'config.recordingRetentionHint',
  },
} as const satisfies Record<string, SettingDef>;
