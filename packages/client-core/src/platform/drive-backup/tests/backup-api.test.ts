import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { backupCalls } from '../backup-api';

const view = {
  enabled: true,
  ready: { minio: true, google: true },
  last: null,
  last_run_at: '2026-11-26T23:00:00+00:00',
  last_error: null,
  quota: null,
  low_quota: false,
  skipped: { count: 0, items: [] },
  waiting: 2,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('drive backup calls', () => {
  it('reads the status line on the path of today', async () => {
    const { client, apiFetch } = clientAnswering({ data: view });
    await expect(backupCalls(client).status()).resolves.toEqual({ data: view });
    expect(apiFetch).toHaveBeenCalledWith('/settings/integrations/storage-backup');
  });

  it('refuses an answer outside the shared view', async () => {
    const { client } = clientAnswering({ data: { ...view, waiting: -1 } });
    await expect(backupCalls(client).status()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
