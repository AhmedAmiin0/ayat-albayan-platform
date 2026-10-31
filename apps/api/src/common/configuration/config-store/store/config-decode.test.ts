import { SETTING_DEFAULTS, SETTINGS_REGISTRY } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { CONFIG_DEFS, CONFIG_KEYS } from './config-defs';
import { decodeAll, decodeValue } from './config-decode';

const reg = SETTINGS_REGISTRY;

describe('decodeValue (ConfigStore read side)', () => {
  it('a missing row and JSON null read as the default, not malformed', () => {
    expect(decodeValue('upload_max_mb', reg.upload_max_mb, undefined)).toEqual({ value: 10, malformed: false });
    expect(decodeValue('upload_max_mb', reg.upload_max_mb, { value: null })).toEqual({ value: 10, malformed: false });
    expect(decodeValue('late_cancel_hours', reg.late_cancel_hours, { value: null }).value).toBeNull();
  });

  it('a valid value is kept; a malformed one reads as the default and is flagged', () => {
    expect(decodeValue('upload_max_mb', reg.upload_max_mb, { value: 4 })).toEqual({ value: 4, malformed: false });
    expect(decodeValue('upload_max_mb', reg.upload_max_mb, { value: '4' })).toEqual({ value: 10, malformed: true });
    expect(decodeValue('upload_max_mb', reg.upload_max_mb, { value: 4.5 }).malformed).toBe(true);
  });

  it('a value the schema would change (untrimmed text) is malformed, like the legacy path', () => {
    expect(decodeValue('default_meeting_title', reg.default_meeting_title, { value: ' حلقة ' }).malformed).toBe(true);
  });

  it.each([
    [true, true, false],
    [false, false, false],
    ['true', false, true],
    [1, false, true],
    [null, false, false],
  ])('send switch stored %j → %j (malformed %j)', (stored, value, malformed) => {
    for (const key of ['messaging_enabled', 'auto_messages_enabled'] as const) {
      expect(decodeValue(key, reg[key], { value: stored })).toEqual({ value, malformed });
    }
  });

  it.each([
    ['module', 'module', false],
    ['legacy', 'legacy', false],
    ['MODULE', 'legacy', true],
    [1, 'legacy', true],
    [null, 'legacy', false],
  ])('comms_source stored %j → %j', (stored, value, malformed) => {
    expect(decodeValue('comms_source', reg.comms_source, { value: stored })).toEqual({ value, malformed });
  });

  it('defaults are copies: a caller cannot mutate the registry', () => {
    const d = decodeValue('follow_up_hours', reg.follow_up_hours, undefined).value as number[];
    d.push(999);
    expect(decodeValue('follow_up_hours', reg.follow_up_hours, undefined).value).toEqual(SETTING_DEFAULTS.follow_up_hours);
  });
});

describe('decodeAll', () => {
  it('covers the registry and the google rows; reports each malformed key', () => {
    const onMalformed = vi.fn();
    const all = decodeAll([{ key: 'google_calendar_window_days', value: 3 }, { key: 'upload_max_mb', value: 4 }], onMalformed);
    expect(Object.keys(all).sort()).toEqual([...CONFIG_KEYS].sort());
    expect(Object.keys(CONFIG_DEFS)).toHaveLength(CONFIG_KEYS.length);
    expect(all).toMatchObject({ google_calendar_window_days: 60, google_sync_enabled: false, upload_max_mb: 4 });
    expect(onMalformed).toHaveBeenCalledExactlyOnceWith('google_calendar_window_days');
  });

  it('with no rows equals the registry defaults', () => {
    const all = decodeAll([]);
    for (const [k, v] of Object.entries(SETTING_DEFAULTS)) expect([k, all[k]]).toEqual([k, v]);
  });
});
