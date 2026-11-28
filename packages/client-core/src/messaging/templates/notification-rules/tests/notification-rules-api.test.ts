import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { notificationRuleCalls } from '../notification-rules-api';

const ENTRY = {
  key: 'lesson_reminder',
  audience: 'guardian',
  channels: ['whatsapp'],
  automatic: true,
  manual: false,
  essential: false,
  locked: false,
  state: 'on',
  blocker: null,
  templates: [{ key: 'lesson_reminder', status: 'approved', line: 'notifications' }],
  lines: ['notifications'],
  timing: { key: 'reminder_minutes_before', value: '30' },
};
const OVERVIEW = { entries: [ENTRY], lines: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('notification rule calls', () => {
  it('reads the catalogue on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(OVERVIEW);
    await expect(notificationRuleCalls(client).overview()).resolves.toEqual(OVERVIEW);
    expect(apiFetch.mock.calls).toEqual([['/admin/notifications']]);
  });

  it('patches one row by its key with only the changed fields', async () => {
    const { client, apiSend } = clientAnswering(ENTRY);
    const body = { timing: { minutes_before: 45 } };
    await expect(
      notificationRuleCalls(client).update({ key: 'lesson_reminder', body }),
    ).resolves.toEqual(ENTRY);
    expect(apiSend.mock.calls).toEqual([['PATCH', '/admin/notifications/lesson_reminder', body]]);
  });

  it('fails the read when a row does not fit the catalogue schema', async () => {
    const { client } = clientAnswering({ entries: [{ ...ENTRY, state: 'maybe' }], lines: [] });
    await expect(notificationRuleCalls(client).overview()).rejects.toBeInstanceOf(ApiError);
  });

  it('passes a server error through unchanged', async () => {
    const failure = new ApiError(428, { message: 'confirmation_required' });
    const apiSend = vi.fn(async () => Promise.reject(failure));
    const client: ApiClient = { apiFetch: vi.fn(), apiSend };
    const update = notificationRuleCalls(client).update({ key: 'renewal_due', body: {} });
    await expect(update).rejects.toBe(failure);
  });
});
