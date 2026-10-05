import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';

/** The seeded defaults (the settings registry; migrations seed the same). Tests only. */
export const SETTINGS: AcademySettings = { ...SETTING_DEFAULTS };
