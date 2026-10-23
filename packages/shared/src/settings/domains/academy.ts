import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/**
 * «الأكاديمية»: contact number, the academy's time zone and the public contact block. SQL reads
 * academy_timezone with its own coalesce default (assistant statements, migration 20261006000273):
 * a default change needs a migration too.
 */
export const ACADEMY_SETTINGS = {
  academy_whatsapp_e164: {
    module: 'academy', group: 'academy', reachesFamilies: true,
    type: 'e164', default: '+966566101447', public: true,
    labelKey: 'settings.academyWhatsapp', hintKey: `${h}.academyWhatsapp`,
  },
  academy_timezone: {
    module: 'academy', group: 'academy',
    type: 'tz', default: 'Asia/Riyadh',
    labelKey: 'settings.academyTimezone', hintKey: `${h}.academyTimezone`,
  },
  /**
   * Printed in the footer of every lesson report (a missing site keeps the built-in one). The
   * WhatsApp number is academy_whatsapp_e164 (one source), not a field here.
   */
  academy_contact: {
    module: 'academy', group: 'academy', reachesFamilies: true,
    type: 'json', default: { site: 'ayatalbayan.com' }, public: true,
    shape: [
      { name: 'site', kind: 'string', format: 'host', max: 100 },
      { name: 'email', kind: 'string', format: 'email', max: 120 },
    ],
    labelKey: 'config.academyContact', hintKey: 'config.academyContactHint',
  },
} as const satisfies Record<string, SettingDef>;

/** https://wa.me/<digits> for the academy's WhatsApp number. */
export const academyWhatsappUrl = (s: { academy_whatsapp_e164: string }): string =>
  `https://wa.me/${s.academy_whatsapp_e164.replace(/^\+/, '')}`;
