import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { usedBeforeCalls } from '../used-before-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PATH = `/subscriptions/${ID}/lessons-used-before`;
const STATE = { subscription_id: ID, lessons_used_before: 2, max: 4, blocked: null };
const RESULT = {
  subscription_id: ID,
  lessons_total: 8,
  lessons_used_before: 3,
  lessons_used: 4,
  remaining: 4,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('used-before calls', () => {
  it('reads the editor state on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(STATE);
    await expect(usedBeforeCalls(client).state(ID)).resolves.toEqual(STATE);
    expect(apiFetch).toHaveBeenCalledWith(PATH);
  });

  it('sends the one number and answers the package lessons', async () => {
    const { client, apiSend } = clientAnswering(RESULT);
    const edit = { id: ID, lessonsUsedBefore: 3 };
    await expect(usedBeforeCalls(client).edit(edit)).resolves.toEqual(RESULT);
    expect(apiSend).toHaveBeenCalledWith('PATCH', PATH, { lessonsUsedBefore: 3 });
  });

  it('throws bad_response for a refusal outside the known blocks', async () => {
    const { client } = clientAnswering({ ...STATE, blocked: 'not_a_block' });
    const failure = await usedBeforeCalls(client)
      .state(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
