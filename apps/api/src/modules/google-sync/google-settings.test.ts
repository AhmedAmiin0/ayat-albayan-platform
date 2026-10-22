import { describe, expect, it } from 'vitest';
import { GOOGLE_DEFAULTS, readGoogleSettings } from './google-settings';

describe('Google sync settings', () => {
  it('default OFF and dry_run with a 60-day window when nothing is stored', () => {
    expect(readGoogleSettings([])).toEqual({ enabled: false, mode: 'dry_run', window_days: 60 });
    expect(GOOGLE_DEFAULTS).toEqual({ enabled: false, mode: 'dry_run', window_days: 60 });
  });

  it('reads stored values', () => {
    const rows = [{ key: 'google_sync_enabled', value: true }, { key: 'google_sync_mode', value: 'live' }, { key: 'google_calendar_window_days', value: 30 }];
    expect(readGoogleSettings(rows)).toEqual({ enabled: true, mode: 'live', window_days: 30 });
  });

  it('a malformed value falls back to the safe default, never to live', () => {
    const rows = [{ key: 'google_sync_enabled', value: 'true' }, { key: 'google_sync_mode', value: 'LIVE' }, { key: 'google_calendar_window_days', value: 999 }];
    expect(readGoogleSettings(rows)).toEqual({ enabled: false, mode: 'dry_run', window_days: 60 });
  });
});
