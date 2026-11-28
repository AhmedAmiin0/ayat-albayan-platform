import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { availabilityCalls } from './availability-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const OFF = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';
const slot = { id: OFF, weekday: 1, start_time: '16:00', end_time: '18:30', tz: 'Africa/Cairo' };
const span = { starts_at: '2026-10-05T10:00:00Z', ends_at: '2026-10-06T10:00:00Z' };
const timeOff = {
  id: OFF,
  teacher_id: ID,
  ...span,
  reason: 'سفر',
  created_at: '2026-10-01T10:00:00Z',
  created_by: null,
  updated_at: '2026-10-01T10:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('availability calls (R-TCH-02)', () => {
  it('reads the weekly grid and the time-off of one teacher', async () => {
    const grid = clientAnswering([slot]);
    await expect(availabilityCalls(grid.client).grid(ID)).resolves.toEqual([slot]);
    expect(grid.apiFetch).toHaveBeenCalledWith(`/teachers/${ID}/availability`);
    const off = clientAnswering([timeOff]);
    await expect(availabilityCalls(off.client).timeOff(ID)).resolves.toEqual([timeOff]);
    expect(off.apiFetch).toHaveBeenCalledWith(`/teachers/${ID}/time-off`);
  });

  it('sends PUT of the grid and POST of a time-off with their bodies', async () => {
    const grid = clientAnswering([slot]);
    const { id: _, ...weekly } = slot;
    await availabilityCalls(grid.client).replaceGrid(ID, { slots: [weekly] });
    expect(grid.apiSend).toHaveBeenCalledWith('PUT', `/teachers/${ID}/availability`, {
      slots: [weekly],
    });
    const off = clientAnswering(timeOff);
    await expect(availabilityCalls(off.client).addTimeOff(ID, span)).resolves.toEqual(timeOff);
    expect(off.apiSend).toHaveBeenCalledWith('POST', `/teachers/${ID}/time-off`, span);
  });

  it('sends DELETE of one time-off and answers nothing', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const removed = availabilityCalls(client).removeTimeOff({ id: ID, timeOffId: OFF });
    await expect(removed).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('DELETE', `/teachers/${ID}/time-off/${OFF}`, undefined);
  });

  it('throws bad_response for a slot on a weekday past Saturday', async () => {
    const { client } = clientAnswering([{ ...slot, weekday: 9 }]);
    const failure = await availabilityCalls(client)
      .grid(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
