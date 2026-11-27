import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { communicationsCalls } from '../communications-api';

const PARITY = {
  source: 'legacy',
  roles: [{ role: 'chat', number_id: null, number_label: null, fields: [] }],
  differences: [],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('communications calls', () => {
  it('reads the parity on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(PARITY);
    await expect(communicationsCalls(client).parity()).resolves.toEqual(PARITY);
    expect(apiFetch.mock.calls).toEqual([['/admin/communications/parity']]);
  });

  it('switches the source with the source as the body', async () => {
    const { client, apiSend } = clientAnswering({ source: 'module' });
    await expect(communicationsCalls(client).setSource('module')).resolves.toEqual({
      source: 'module',
    });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/admin/communications/source', { source: 'module' }],
    ]);
  });

  it('refuses a parity whose source it does not know', async () => {
    const { client } = clientAnswering({ ...PARITY, source: 'cloud' });
    await expect(communicationsCalls(client).parity()).rejects.toBeInstanceOf(ApiError);
  });
});
