import type { SettingDef } from '../defs.js';

/**
 * The family app and pages (owner 2026-11-14, docs/50 §2, §5): the teacher ↔ family chat, off by
 * default («all chat in app is turned off by default from the config»; the API answers 403
 * family_chat_off while off), and the payment instructions shown under the package's amount due
 * (empty = nothing shown).
 */
export const FAMILY_APP_SETTINGS = {
  family_chat_enabled: {
    module: 'family_app', group: 'family', confirm: 'simple', reachesFamilies: true, public: true,
    type: 'bool', default: false,
    labelKey: 'familyAuth.settings.chat', hintKey: 'familyAuth.settings.chatHint',
  },
  /** Owner 2026-11-16: the room inside the family app (off = the browser, as before). */
  family_meetings_in_app: {
    module: 'family_app', group: 'family', reachesFamilies: true, public: true,
    type: 'bool', default: false,
    labelKey: 'familyAuth.settings.meetings', hintKey: 'familyAuth.settings.meetingsHint',
  },
  family_payment_instructions: {
    module: 'family_app', group: 'family', reachesFamilies: true,
    type: 'string', default: '', minLength: 0, maxLength: 1000,
    labelKey: 'familyAuth.settings.paymentInstructions',
    hintKey: 'familyAuth.settings.paymentInstructionsHint',
  },
} as const satisfies Record<string, SettingDef>;
