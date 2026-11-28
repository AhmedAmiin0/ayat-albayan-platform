import { SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { settingsCalls } from '..';

const lists = { saved: ['late_cancel_hours'], moved: [], invalid: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('settings calls', () => {
  it('reads every setting on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(SETTING_DEFAULTS);
    await expect(settingsCalls(client).view()).resolves.toEqual(SETTING_DEFAULTS);
    expect(apiFetch).toHaveBeenCalledWith('/settings');
  });

  it('refuses settings outside the shared schema', async () => {
    const { client } = clientAnswering({ ...SETTING_DEFAULTS, reminder_minutes_before: 1 });
    await expect(settingsCalls(client).view()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });

  it('sends only the changed fields and reads the per-key lists back', async () => {
    const answer = { ...SETTING_DEFAULTS, ...lists };
    const { client, apiSend } = clientAnswering(answer);
    await expect(settingsCalls(client).update({ lateCancelHours: 24 })).resolves.toEqual(answer);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { lateCancelHours: 24 });
  });

  it('refuses a write answer without its lists', async () => {
    const { client } = clientAnswering(SETTING_DEFAULTS);
    await expect(settingsCalls(client).update({})).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
