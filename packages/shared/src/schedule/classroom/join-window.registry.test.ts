import { describe, expect, it } from 'vitest';
import { DEFAULT_JOIN_WINDOW, joinWindowConfig, MAKEUP_WINDOW_DAYS } from '@ab/schedule';
import { SETTING_DEFAULTS, SETTINGS_REGISTRY } from '@ab/settings';

// schedule may not import settings, so its literal defaults are pinned to the registry here.
describe('schedule defaults match the settings registry', () => {
  it('DEFAULT_JOIN_WINDOW is the registry join window', () => {
    expect(joinWindowConfig(SETTING_DEFAULTS)).toEqual(DEFAULT_JOIN_WINDOW);
  });

  it('MAKEUP_WINDOW_DAYS is the registry makeup_window_days default', () => {
    expect(SETTINGS_REGISTRY.makeup_window_days.default).toBe(MAKEUP_WINDOW_DAYS);
  });
});
