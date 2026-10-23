import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { SettingsService } from './settings.service';

/** Tests only: a SettingsService answering the registry defaults, with `over` on top. */
export function fakeSettings(over: Partial<AcademySettings> = {}): SettingsService {
  const all = vi.fn(async (): Promise<AcademySettings> => ({ ...SETTING_DEFAULTS, ...over }));
  const get = vi.fn(async <K extends keyof AcademySettings>(key: K) => (await all())[key]);
  return {
    all,
    get,
    lateCancelHours: vi.fn(() => get('late_cancel_hours')),
    bookingHorizonWeeks: vi.fn(() => get('booking_horizon_weeks')),
    salesAutoAssign: vi.fn(() => get('sales_auto_assign')),
  } as unknown as SettingsService;
}
