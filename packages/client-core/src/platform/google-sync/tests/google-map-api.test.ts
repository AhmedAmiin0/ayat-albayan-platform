import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { googleMapCalls } from '../google-map-api';

const ID = '5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const FOLDER = '1AbCdEfGhIjKlMnOpQrStUv';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('google sync mapping calls', () => {
  it('reads the teachers, the students and the calendar owner on the paths of today', async () => {
    const { client, apiFetch } = clientAnswering([]);
    const calls = googleMapCalls(client);
    await expect(calls.teachers()).resolves.toEqual([]);
    await expect(calls.students({ q: 'AB-0002' })).resolves.toEqual([]);
    await expect(calls.calendarOwner({ id: ID })).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
    const paths = apiFetch.mock.calls.map((args: unknown[]) => args[0]);
    expect(paths).toEqual([
      '/admin/google/teachers',
      '/admin/google/students?q=AB-0002',
      `/admin/google/teachers/${ID}/calendar-owner`,
    ]);
  });

  it('sends the mapping changes with their bodies', async () => {
    const { client, apiSend } = clientAnswering([]);
    const calls = googleMapCalls(client);
    const files = { folder_id: FOLDER, attendance_sheet_id: null };
    await expect(calls.setTeacher({ id: ID }, { calendar_id: null })).resolves.toEqual([]);
    await Promise.allSettled([
      calls.setCalendarOwner({ id: ID }, { owner: 'platform' }),
      calls.setStudent({ id: ID }, files),
      calls.unsetStudent({ id: ID }),
    ]);
    expect(apiSend.mock.calls).toEqual([
      ['PUT', `/admin/google/teachers/${ID}`, { calendar_id: null }],
      ['PUT', `/admin/google/teachers/${ID}/calendar-owner`, { owner: 'platform' }],
      ['PUT', `/admin/google/students/${ID}`, files],
      ['DELETE', `/admin/google/students/${ID}`, undefined],
    ]);
  });
});
