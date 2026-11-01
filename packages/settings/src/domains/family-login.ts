import type { SettingDef } from '../defs.js';

/**
 * Family accounts (owner 2026-10-27, docs/30): sign-in and password codes by WhatsApp. Built dark:
 * while family_login_enabled is off (or account_code is not approved) the family tab says «not yet»
 * and staff «نسيت كلمة المرور؟» points to the admin's reset.
 */
export const FAMILY_LOGIN_SETTINGS = {
  family_login_enabled: {
    module: 'family_login', group: 'academy', confirm: 'simple', reachesFamilies: true,
    type: 'bool', default: false, labelKey: 'familyAuth.settings.enabled', hintKey: 'familyAuth.settings.enabledHint',
  },
  login_code_ttl_minutes: {
    module: 'family_login', group: 'academy', reachesFamilies: true,
    type: 'int', default: 10, min: 3, max: 30,
    labelKey: 'familyAuth.settings.ttl', hintKey: 'familyAuth.settings.ttlHint',
  },
  login_code_max_attempts: {
    module: 'family_login', group: 'academy', reachesFamilies: true,
    type: 'int', default: 5, min: 3, max: 10,
    labelKey: 'familyAuth.settings.attempts', hintKey: 'familyAuth.settings.attemptsHint',
  },
} as const satisfies Record<string, SettingDef>;
