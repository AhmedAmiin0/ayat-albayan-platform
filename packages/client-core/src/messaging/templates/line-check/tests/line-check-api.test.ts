import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { lineCheckCalls } from '../line-check-api';

const VIEW = {
  line: 'chat',
  configured: false,
  provider: 'meta',
  gaps: ['WA_CHAT_TOKEN'],
  duplicate_chat_phone: false,
  phone_number_id: null,
  waba_id: null,
  app_id: null,
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: null,
  errors: [],
  checked_at: '2026-10-10T08:00:00.000Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('line check calls', () => {
  it('posts the check on the path of today, with no body', async () => {
    const { client, apiSend } = clientAnswering([VIEW]);
    await expect(lineCheckCalls(client).check()).resolves.toEqual([VIEW]);
    expect(apiSend.mock.calls).toEqual([['POST', '/messaging/lines/check', undefined]]);
  });

  it('refuses an answer whose line it does not know', async () => {
    const { client } = clientAnswering([{ ...VIEW, line: 'sales' }]);
    await expect(lineCheckCalls(client).check()).rejects.toBeInstanceOf(ApiError);
  });
});
