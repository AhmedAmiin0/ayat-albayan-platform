import { SETTING_DEFAULTS, type SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { fakeSettings } from './settings.fakes';
import { readSlice, type SettingsSlice } from './settings-slice';
import { SettingsService } from './settings.service';

const KEYS = ['booking_horizon_weeks', 'sales_auto_assign'] as const satisfies readonly SettingKey[];

/** A test-only reader, written to the template in settings-slice.ts. */
@Injectable()
class ProbeSettings {
  constructor(private readonly store: SettingsService) {}
  read(): Promise<SettingsSlice<(typeof KEYS)[number]>> {
    return readSlice(this.store, KEYS);
  }
}

describe('a settings reader under Nest DI', () => {
  it('resolves with SettingsService overridden by fakeSettings, as the HTTP harnesses do', async () => {
    const store = fakeSettings({ booking_horizon_weeks: 8 });
    const mod = await Test.createTestingModule({ providers: [SettingsService, ProbeSettings] })
      .overrideProvider(SettingsService).useValue(store)
      .compile();
    const reader = mod.get(ProbeSettings);
    expect(await reader.read()).toEqual({ booking_horizon_weeks: 8, sales_auto_assign: SETTING_DEFAULTS.sales_auto_assign });
    expect(store.all).toHaveBeenCalledTimes(1);
    await mod.close();
  });
});
