import type { SettingDef } from '../defs.js';

/**
 * The family app and pages (docs/50 §2, §5): the teacher ↔ family chat, off by default (the API
 * answers 403 family_chat_off while off), and the payment instructions shown under the package's
 * amount due (empty = nothing shown).
 */
export const FAMILY_APP_SETTINGS = {
  family_chat_enabled: {
    module: 'family_app', group: 'family', confirm: 'simple', reachesFamilies: true, public: true,
    type: 'bool', default: false,
    labelKey: 'familyAuth.settings.chat', hintKey: 'familyAuth.settings.chatHint',
  },
  /** The room inside the family app (off = the browser). */
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
