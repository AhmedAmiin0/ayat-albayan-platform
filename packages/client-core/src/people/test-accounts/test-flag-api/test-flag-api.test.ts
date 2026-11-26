import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { testFlagCall } from './test-flag-api';

const ID = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';

const clientAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { client, apiSend };
};

describe('testFlagCall (docs/56)', () => {
  it.each([
    ['user', `/admin/users/${ID}/test`],
    ['student', `/students/${ID}/test`],
  ] as const)('PATCHes the %s switch at %s', async (target, path) => {
    const { client, apiSend } = clientAnswering({ id: ID, is_test: true });
    const write = { target, id: ID, isTest: true };
    await expect(testFlagCall(client)(write)).resolves.toEqual({ id: ID, is_test: true });
    expect(apiSend).toHaveBeenCalledWith('PATCH', path, { is_test: true });
  });

  it('throws bad_response for an answer without the flag', async () => {
    const { client } = clientAnswering({ id: ID });
    const write = { target: 'student', id: ID, isTest: false } as const;
    const failure = await testFlagCall(client)(write).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
