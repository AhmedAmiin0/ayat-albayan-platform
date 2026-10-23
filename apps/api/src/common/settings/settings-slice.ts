import type { AcademySettings, SettingKey } from '@ab/shared';
import type { SettingsService } from './settings.service';

/**
 * The reader kernel. Each consuming module declares the settings it reads in one typed reader,
 * `<module>.settings.ts`, next to its code:
 *
 *   const KEYS = ['late_cancel_hours', 'booking_horizon_weeks'] as const satisfies readonly SettingKey[];
 *   export type XSettingsValues = SettingsSlice<(typeof KEYS)[number]>;
 *
 *   @Injectable()
 *   export class XSettings {
 *     constructor(private readonly store: SettingsService) {}
 *     read(): Promise<XSettingsValues> { return readSlice(this.store, KEYS); }
 *   }
 *
 * Register the reader in the module's providers (in every module that provides its consumer) and
 * inject it instead of SettingsService. Readers call only `store.all()`, so the existing fakes
 * (fakeSettings, readerOf) and `overrideProvider(SettingsService)` harnesses keep working.
 */

/** The listed keys of the academy settings, typed as the registry types them. */
export type SettingsSlice<K extends SettingKey> = Pick<AcademySettings, K>;

/** One store.all() call (cached by SettingsService), then only the listed keys. */
export async function readSlice<K extends SettingKey>(store: Pick<SettingsService, 'all'>, keys: readonly K[]): Promise<SettingsSlice<K>> {
  const all = await store.all();
  return Object.fromEntries(keys.map((k) => [k, all[k]])) as SettingsSlice<K>;
}
