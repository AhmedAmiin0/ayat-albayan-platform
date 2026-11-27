import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { configEntryCalls } from '..';

const ENTRY = {
  key: 'upload_max_mb',
  module: 'uploads',
  group: 'uploads',
  type: 'int',
  bounds: { min: 1 },
  value: 4,
  defaultValue: 10,
  stored: true,
  description: null,
  descriptionSeed: null,
  descriptionEdited: false,
  hintKey: null,
  labelKey: 'settings.label.upload',
  public: true,
  version: 7,
  updatedAt: '2026-10-23T10:00:00+00:00',
  updatedByName: null,
  ownedBy: null,
  confirm: null,
  retired: false,
};

const clientAnswering = (answer: unknown): ApiClient => ({
  apiFetch: vi.fn(async () => answer),
  apiSend: vi.fn(async () => answer),
});

describe('config entry calls', () => {
  it('reads every row on the path of today', async () => {
    const client = clientAnswering({ entries: [ENTRY] });
    await expect(configEntryCalls(client).list()).resolves.toEqual({ entries: [ENTRY] });
    expect(client.apiFetch).toHaveBeenCalledWith('/config/entries');
  });

  it('saves a value and a description by key', async () => {
    const client = clientAnswering({ entry: ENTRY });
    const calls = configEntryCalls(client);
    const body = { value: 4, expectedVersion: 7 };
    await expect(calls.patch({ key: 'upload_max_mb', body })).resolves.toEqual({ entry: ENTRY });
    await calls.describe({ key: 'upload_max_mb', text: null });
    const path = '/config/entries/upload_max_mb';
    expect(client.apiSend).toHaveBeenNthCalledWith(1, 'PATCH', path, body);
    const described = `${path}/description`;
    expect(client.apiSend).toHaveBeenNthCalledWith(2, 'PUT', described, { text: null });
  });

  it('refuses an answer outside the shared schema', async () => {
    const client = clientAnswering({ entries: [{ ...ENTRY, version: -1 }] });
    await expect(configEntryCalls(client).list()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
