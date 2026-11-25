import { clickToChatLink } from '@ab/core';
import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/** SQL has its own academy_timezone default (migration 20261006000273): change both. */
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
  /** Maintenance mode: the four apps cover all screens but admins'. */
  maintenance_mode: {
    module: 'academy', group: 'system', confirm: 'simple', reachesFamilies: true, public: true,
    type: 'bool', default: false, labelKey: 'settings.maintenanceMode', hintKey: `${h}.maintenanceMode`,
  },
} as const satisfies Record<string, SettingDef>;

/** https://wa.me/<digits> for the academy's WhatsApp number. */
export const academyWhatsappUrl = (s: { academy_whatsapp_e164: string }): string =>
  clickToChatLink(s.academy_whatsapp_e164);
