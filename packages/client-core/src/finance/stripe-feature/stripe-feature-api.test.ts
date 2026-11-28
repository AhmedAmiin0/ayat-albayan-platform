import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { stripeFeatureCall } from './stripe-feature-api';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('stripeFeatureCall', () => {
  it('reads GET /stripe/feature', async () => {
    const { client, apiFetch } = clientAnswering({ stripe: true });
    await expect(stripeFeatureCall(client)()).resolves.toEqual({ stripe: true });
    expect(apiFetch).toHaveBeenCalledWith('/stripe/feature');
  });

  it('refuses an answer without the flag', async () => {
    const { client } = clientAnswering({});
    const failure = await stripeFeatureCall(client)().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/stripe/feature' } });
  });
});
