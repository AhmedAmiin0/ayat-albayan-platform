import { PUBLIC_CONFIG_QUERY_KEY, SETTING_DEFAULTS } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_QUERY_KEYS } from './query-keys';
import { settingsQuery, updateSettings } from './settings-api';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('./api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('CONFIG_QUERY_KEYS (the legacy key values, unchanged)', () => {
  it('names every settings-family key with its literal value', () => {
    expect(CONFIG_QUERY_KEYS).toEqual({
      settings: ['settings'],
      publicConfig: ['settings', 'public'],
      integrations: ['settings', 'integrations'],
      settingsMeta: ['config', 'meta'],
      customConfig: ['config', 'custom'],
      entries: ['config', 'entries'],
    });
    expect(CONFIG_QUERY_KEYS.publicConfig).toBe(PUBLIC_CONFIG_QUERY_KEY);
  });
});

describe('settings data access', () => {
  it('settingsQuery reads GET /settings under [settings]', async () => {
    apiFetch.mockResolvedValue(SETTING_DEFAULTS);
    expect(settingsQuery.queryKey).toEqual(['settings']);
    const queryFn = settingsQuery.queryFn;
    if (typeof queryFn !== 'function') throw new Error('no queryFn');
    await expect(Promise.resolve(queryFn({} as never))).resolves.toBe(SETTING_DEFAULTS);
    expect(apiFetch).toHaveBeenCalledWith('/settings');
  });

  it('updateSettings sends PATCH /settings with the body as given', async () => {
    apiSend.mockResolvedValue(SETTING_DEFAULTS);
    await expect(updateSettings({ salesAutoAssign: true })).resolves.toBe(SETTING_DEFAULTS);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { salesAutoAssign: true });
  });
});
