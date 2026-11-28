import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { receivablesCall } from './receivables-api';

const empty = { rows: [], totals: [], total: 0, currency: 'SAR', fx_missing: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('receivablesCall', () => {
  it('reads GET /receivables', async () => {
    const { client, apiFetch } = clientAnswering(empty);
    await expect(receivablesCall(client)()).resolves.toEqual(empty);
    expect(apiFetch).toHaveBeenCalledWith('/receivables');
  });

  it('refuses an answer without its totals', async () => {
    const { client } = clientAnswering({ rows: [] });
    const failure = await receivablesCall(client)().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/receivables' } });
  });
});
