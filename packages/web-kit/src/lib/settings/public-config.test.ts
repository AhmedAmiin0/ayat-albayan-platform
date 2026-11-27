import { PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicConfigQuery } from './public-config';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const read = () => new QueryClient().query(publicConfigQuery);

describe('publicConfigQuery', () => {
  beforeEach(() => apiFetch.mockReset());

  it('keeps the cache key and the 5-minute stale time the admin save invalidates', () => {
    expect(publicConfigQuery.queryKey).toEqual(['settings', 'public']);
    expect(publicConfigQuery.staleTime).toBe(300_000);
  });

  it('reads GET /settings/public and keeps the public custom values', async () => {
    const answer = { ...PUBLIC_SETTING_DEFAULTS, upload_max_mb: 3, custom: { promo: 'hi' } };
    apiFetch.mockResolvedValue(answer);
    await expect(read()).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith('/settings/public');
  });

  it('reads an odd value as its default', async () => {
    apiFetch.mockResolvedValue({ upload_max_mb: 'ten' });
    await expect(read()).resolves.toEqual({ ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  });
});
