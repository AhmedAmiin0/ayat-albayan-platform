import { PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { publicConfigCalls } from '..';

const clientAnswering = (answer: unknown): ApiClient => ({
  apiFetch: vi.fn(async () => answer),
  apiSend: vi.fn(async () => answer),
});

describe('public config calls', () => {
  it('reads the public settings on the path of today', async () => {
    const answer = { ...PUBLIC_SETTING_DEFAULTS, upload_max_mb: 3, custom: { promo: 'hi' } };
    const client = clientAnswering(answer);
    await expect(publicConfigCalls(client).get()).resolves.toEqual(answer);
    expect(client.apiFetch).toHaveBeenCalledWith('/settings/public');
  });

  it('reads an odd value as its default', async () => {
    const client = clientAnswering({ upload_max_mb: 'ten', custom: 7 });
    const defaults = { ...PUBLIC_SETTING_DEFAULTS, custom: {} };
    await expect(publicConfigCalls(client).get()).resolves.toEqual(defaults);
  });

  it('fails when no body came back', async () => {
    await expect(publicConfigCalls(clientAnswering(undefined)).get()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
