import { catalogueViews } from '@ab/shared';
import { SETTING_DEFAULTS } from '@ab/settings';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogueQuery } from './catalogue-api';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const entries = catalogueViews({ settings: SETTING_DEFAULTS, gateReason: null, templates: new Map() });
const read = (version: number) => new QueryClient().fetchQuery(catalogueQuery(version));

afterEach(() => apiFetch.mockReset());

describe('catalogueQuery', () => {
  it('reads GET /admin/notifications and answers the catalogue', async () => {
    apiFetch.mockResolvedValue({ entries, lines: [] });
    await expect(read(1)).resolves.toEqual({ entries, lines: [] });
    expect(apiFetch).toHaveBeenCalledWith('/admin/notifications');
  });

  it('fails the read when a row does not fit the catalogue schema', async () => {
    apiFetch.mockResolvedValue({ entries: [{ ...entries[0], state: 'maybe' }], lines: [] });
    await expect(read(2)).rejects.toMatchObject({ body: { code: 'bad_response' } });
  });
});
