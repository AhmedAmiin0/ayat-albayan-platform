import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { numberTemplateCalls } from '../number-templates-api';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const SYNC = {
  number_id: ID,
  ok: true,
  checked_at: '2026-11-27T10:00:00.000Z',
  meta_count: 2,
  synced: 2,
  number_ids: [ID],
};

describe('number template calls', () => {
  it('syncs one number on the path of today with no body', async () => {
    const apiSend = vi.fn(async () => SYNC);
    const client: ApiClient = { apiFetch: vi.fn(), apiSend };
    await expect(numberTemplateCalls(client).sync(ID)).resolves.toEqual(SYNC);
    expect(apiSend.mock.calls).toEqual([['POST', `/admin/numbers/${ID}/templates/sync`, undefined]]);
  });
});
