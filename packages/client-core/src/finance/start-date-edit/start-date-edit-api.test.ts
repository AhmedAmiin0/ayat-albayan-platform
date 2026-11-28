import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http';
import { startDateEditCall } from './start-date-edit-api';

const SUB = 'e5555555-5555-4555-8555-555555555555';

describe('startDateEditCall', () => {
  it('sends PATCH /subscriptions/:id/start-date with the day and reads the result', async () => {
    const result = { subscription_id: SUB, starts_on: '2026-11-01' };
    const apiSend = vi.fn(async () => result);
    const client: ApiClient = { apiFetch: vi.fn(), apiSend };
    await expect(startDateEditCall(client)(SUB, '2026-11-01')).resolves.toEqual(result);
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/subscriptions/${SUB}/start-date`, {
      startsOn: '2026-11-01',
    });
  });
});
