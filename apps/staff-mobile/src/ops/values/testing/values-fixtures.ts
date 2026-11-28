import type { SettingsMetaResponse } from '@ab/settings';
import { settings } from '@/ops/shared/fixtures';

export const meta: SettingsMetaResponse = {
  meta: {
    booking_horizon_weeks: {
      updatedAt: '2026-10-20T09:00:00Z',
      updatedBy: 'a0000000-0000-4000-8000-000000000001',
      updatedByName: 'سارة',
    },
  },
};

export const valuesAnswer = (permissions: string[]) => (path: string) =>
  Promise.resolve(
    path === '/auth/me' ? { role: 'admin', permissions } : path === '/config/meta' ? meta : settings,
  );

export const WRITER = ['settings.read', 'settings.write'];
export const READER = ['settings.read'];
