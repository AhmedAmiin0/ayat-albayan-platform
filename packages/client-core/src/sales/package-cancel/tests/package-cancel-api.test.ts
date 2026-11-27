import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesPackageCancelCalls } from '../package-cancel-api';

const ID = '11111111-1111-4111-8111-111111111111';
const PATH = `/sales/packages/${ID}/cancel`;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

const failureOf = (p: Promise<unknown>) => p.catch((e: unknown) => e);

describe('«إلغاء الباقة» calls of the assistant', () => {
  it('reads the check on the path of today', async () => {
    const { client, apiFetch } = clientAnswering({ subscriptionId: ID, block: 'has_lessons' });
    const check = await salesPackageCancelCalls(client).check(ID);
    expect(check.block).toBe('has_lessons');
    expect(apiFetch).toHaveBeenCalledWith(PATH);
  });

  it('throws bad_response for a block code outside the list', async () => {
    const { client } = clientAnswering({ subscriptionId: ID, block: 'nope' });
    const failure = await failureOf(salesPackageCancelCalls(client).check(ID));
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('posts the reason and reads the cancelled package', async () => {
    const done = { id: ID, status: 'cancelled' };
    const { client, apiSend } = clientAnswering(done);
    const calls = salesPackageCancelCalls(client);
    await expect(calls.cancel({ subscriptionId: ID, body: { reason: 'خطأ' } })).resolves.toEqual(
      done,
    );
    expect(apiSend).toHaveBeenCalledWith('POST', PATH, { reason: 'خطأ' });
  });

  it('throws bad_response for a cancel answer that is not cancelled', async () => {
    const { client } = clientAnswering({ id: ID, status: 'active' });
    const failure = await failureOf(
      salesPackageCancelCalls(client).cancel({ subscriptionId: ID, body: {} }),
    );
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
