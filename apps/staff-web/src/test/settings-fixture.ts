import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';

/** The seeded defaults (the settings registry; migrations seed the same). Tests only. */
export const SETTINGS: AcademySettings = { ...SETTING_DEFAULTS };

/** GET /admin/notifications for page tests that are not about it: no rows, no kept numbers. */
export const CATALOGUE_ROUTE = ['/admin/notifications', { entries: [], lines: [] }] as const;
