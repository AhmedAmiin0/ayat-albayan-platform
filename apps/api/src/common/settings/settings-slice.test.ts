import { SETTING_DEFAULTS, type SettingKey } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfigStore } from '../config-store/config-store.fakes';
import type { Db } from '../db/db.module';
import { fakeSettings, readerOf } from './settings.fakes';
import { readSlice, type SettingsSlice } from './settings-slice';
import { SettingsService } from './settings.service';

const KEYS = ['late_cancel_hours', 'upload_max_mb'] as const satisfies readonly SettingKey[];
type ProbeValues = SettingsSlice<(typeof KEYS)[number]>;

/** A reader written to the template in settings-slice.ts (test only). */
class ProbeSettings {
  constructor(private readonly store: SettingsService) {}
  read(): Promise<ProbeValues> {
    return readSlice(this.store, KEYS);
  }
}

/** A real SettingsService over `rows` (or a read error), counting the database reads. */
function storeOver(rows: { key: string; value: unknown }[] | Error) {
  const result = rows instanceof Error ? { data: null, error: { message: rows.message } } : { data: rows, error: null };
  const select = vi.fn().mockResolvedValue(result);
  return { store: new SettingsService({ from: () => ({ select }) } as unknown as Db, 30_000, fakeConfigStore()), select };
}

describe('readSlice (the settings reader kernel)', () => {
  it('answers exactly the listed keys, typed by the registry', async () => {
    const slice = await readSlice(fakeSettings({ upload_max_mb: 4 }), KEYS);
    expect(slice).toEqual({ late_cancel_hours: null, upload_max_mb: 4 });
    expect(Object.keys(slice)).toEqual(['late_cancel_hours', 'upload_max_mb']);
  });

  it('fills the registry defaults for missing or malformed rows', async () => {
    const { store } = storeOver([{ key: 'upload_max_mb', value: 'four' }]);
    expect(await readSlice(store, KEYS)).toEqual({ late_cancel_hours: SETTING_DEFAULTS.late_cancel_hours, upload_max_mb: SETTING_DEFAULTS.upload_max_mb });
  });

  it('propagates a failed read instead of guessing', async () => {
    await expect(readSlice(storeOver(new Error('boom')).store, KEYS)).rejects.toThrow(/boom/);
    const store = { all: vi.fn().mockRejectedValue(new Error('down')) };
    await expect(readSlice(store, KEYS)).rejects.toThrow('down');
  });

  it('makes one all() call per read, and the store cache serves the next reads', async () => {
    const store = fakeSettings();
    await readSlice(store, KEYS);
    expect(store.all).toHaveBeenCalledTimes(1);
    const real = storeOver([]);
    await readSlice(real.store, KEYS);
    await readSlice(real.store, ['booking_horizon_weeks']);
    expect(real.select).toHaveBeenCalledTimes(1);
  });

  it('an empty key list answers an empty slice', async () => {
    expect(await readSlice(fakeSettings(), [])).toEqual({});
  });
});

describe('readerOf (tests only)', () => {
  it('builds a reader over fakeSettings, with the overrides on top of the defaults', async () => {
    expect(await readerOf(ProbeSettings, { late_cancel_hours: 24 }).read()).toEqual({ late_cancel_hours: 24, upload_max_mb: SETTING_DEFAULTS.upload_max_mb });
    expect(await readerOf(ProbeSettings).read()).toEqual({ late_cancel_hours: null, upload_max_mb: SETTING_DEFAULTS.upload_max_mb });
  });
});
