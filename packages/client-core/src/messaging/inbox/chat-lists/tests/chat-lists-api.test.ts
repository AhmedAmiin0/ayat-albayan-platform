import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { chatListCalls } from '../chat-lists-api';

const ID = 'e1111111-1111-4111-8111-111111111111';
const LIST = { id: ID, name: 'عملاء', count: 0, auto_rule: null };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('chat list calls (docs/22 §3)', () => {
  it('reads every list', async () => {
    const { client, apiFetch } = clientAnswering([LIST]);
    await expect(chatListCalls(client).all()).resolves.toEqual([LIST]);
    expect(apiFetch).toHaveBeenCalledWith('/chat-lists');
  });

  it('creates and renames by the list name', async () => {
    const { client, apiSend } = clientAnswering(LIST);
    await expect(chatListCalls(client).create('عملاء')).resolves.toEqual(LIST);
    await chatListCalls(client).rename({ id: ID, name: 'عملاء' });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/chat-lists', { name: 'عملاء' }],
      ['PATCH', `/chat-lists/${ID}`, { name: 'عملاء' }],
    ]);
  });

  it('deletes a list and puts a chat in or out by its encoded number', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    const calls = chatListCalls(client);
    await calls.remove(ID);
    await calls.setMember({ id: ID, phone: '+966501234567', member: true });
    await calls.setMember({ id: ID, phone: '+966501234567', member: false });
    const member = `/chat-lists/${ID}/threads/%2B966501234567`;
    expect(apiSend.mock.calls).toEqual([
      ['DELETE', `/chat-lists/${ID}`, undefined],
      ['PUT', member, undefined],
      ['DELETE', member, undefined],
    ]);
  });

  it('throws bad_response for a list without its count', async () => {
    const { client } = clientAnswering([{ id: ID, name: 'x', auto_rule: null }]);
    const failure = await chatListCalls(client)
      .all()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
