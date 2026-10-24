import { publicSettings, SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { SettingsService } from './settings.service';

/** Tests only: a SettingsService (storage API) answering the registry defaults, with `over` on top. */
export function fakeSettings(over: Partial<AcademySettings> = {}): SettingsService {
  const all = vi.fn(async (): Promise<AcademySettings> => ({ ...SETTING_DEFAULTS, ...over }));
  return {
    all,
    publicView: vi.fn(async () => publicSettings(await all())),
    write: vi.fn(async () => undefined),
    writeSwitch: vi.fn(async () => undefined),
    invalidate: vi.fn(),
  } as unknown as SettingsService;
}

/** Tests only: a typed settings reader (settings-slice.ts) over fakeSettings(over). */
export function readerOf<R>(Reader: new (store: SettingsService) => R, over: Partial<AcademySettings> = {}): R {
  return new Reader(fakeSettings(over));
}
