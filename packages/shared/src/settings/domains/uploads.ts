import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/** «الملفات المرفوعة»: one limit for receipts and booking invoices, at most the buckets' 10 MB (migrations 122, 170). */
export const UPLOAD_SETTINGS = {
  upload_max_mb: {
    type: 'int', default: 10, min: 1, max: 10, public: true,
    labelKey: 'settings.uploadMaxMb', hintKey: `${h}.uploadMaxMb`,
  },
} as const satisfies Record<string, SettingDef>;

/** Upload limit in bytes (upload_max_mb, at most the buckets' 10 MB). */
export const uploadMaxBytes = (s: { upload_max_mb: number }): number => s.upload_max_mb * 1024 * 1024;
