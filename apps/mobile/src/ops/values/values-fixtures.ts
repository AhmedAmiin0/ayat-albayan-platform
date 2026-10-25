import type { SettingsMetaResponse } from '@ab/shared';
import { settings } from '../shared/fixtures';

export const meta: SettingsMetaResponse = {
  meta: {
    booking_horizon_weeks: { updatedAt: '2026-10-20T09:00:00Z', updatedBy: 'u1', updatedByName: 'سارة' },
  },
};

/** GET answers for «القيم»: /auth/me with these permissions, /settings, /config/meta. */
export const valuesAnswer = (permissions: string[]) => (path: string) =>
  Promise.resolve(
    path === '/auth/me' ? { role: 'admin', permissions } : path === '/config/meta' ? meta : settings,
  );

export const WRITER = ['settings.read', 'settings.write'];
export const READER = ['settings.read'];
