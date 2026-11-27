import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { messageHideCalls } from '../message-hide-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PATH = `/threads/%2B966501234567/messages/${ID}/hide`;
const TARGET = { phone: '+966501234567', messageId: ID };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('message hide calls', () => {
  it('hides and shows a message on the paths of today, with no body', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const calls = messageHideCalls(client);
    await expect(calls.hide(TARGET)).resolves.toBeUndefined();
    await expect(calls.unhide(TARGET)).resolves.toBeUndefined();
    expect(apiSend.mock.calls).toEqual([
      ['POST', PATH, undefined],
      ['DELETE', PATH, undefined],
    ]);
  });

  it('refuses an answer where none is expected', async () => {
    const { client } = clientAnswering({ hidden: true });
    await expect(messageHideCalls(client).hide(TARGET)).rejects.toBeInstanceOf(ApiError);
  });
});
