import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { googleAdminCalls } from '../google-admin-api';

const ITEM_ID = '0b9f4a52-3c1e-4d7a-9a7e-2f1c3b4d5e6f';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('google sync admin calls', () => {
  it('reads the status, the consent url and the log on the paths of today', async () => {
    const { client, apiFetch } = clientAnswering({ url: 'https://accounts.google.com' });
    const calls = googleAdminCalls(client);
    await expect(calls.connect()).resolves.toEqual({ url: 'https://accounts.google.com' });
    await expect(calls.status()).rejects.toMatchObject({ body: { code: 'bad_response' } });
    await expect(calls.items()).rejects.toMatchObject({ body: { code: 'bad_response' } });
    const paths = apiFetch.mock.calls.map((args: unknown[]) => args[0]);
    expect(paths).toEqual(['/admin/google/connect', '/admin/google/status', '/admin/google/items']);
  });

  it('sends the changes with their bodies', async () => {
    const { client, apiSend } = clientAnswering({ queued: 2 });
    const calls = googleAdminCalls(client);
    const drive = { root_folder_id: '1AbCdEfGhIjKlMnOpQrStUv', summary_sheet_id: null };
    await Promise.allSettled([
      calls.disconnect(),
      calls.settings({ enabled: true }),
      calls.discover(),
      calls.drive(drive),
      calls.retry({ id: ITEM_ID }),
    ]);
    await expect(calls.reconcile()).resolves.toEqual({ queued: 2 });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/admin/google/disconnect', undefined],
      ['PUT', '/admin/google/settings', { enabled: true }],
      ['POST', '/admin/google/discover', undefined],
      ['PUT', '/admin/google/drive', drive],
      ['POST', `/admin/google/items/${ITEM_ID}/retry`, undefined],
      ['POST', '/admin/google/reconcile', undefined],
    ]);
  });
});
