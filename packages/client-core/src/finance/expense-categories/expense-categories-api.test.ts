import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { expenseCategoryCalls } from './expense-categories-api';

const category = { key: 'fuel', label_ar: 'وقود', label_en: null, active: true };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('expenseCategoryCalls', () => {
  it('reads GET /expense-categories', async () => {
    const { client, apiFetch } = clientAnswering([category]);
    await expect(expenseCategoryCalls(client).list()).resolves.toEqual([category]);
    expect(apiFetch).toHaveBeenCalledWith('/expense-categories');
  });

  it('adds one with POST /expense-categories', async () => {
    const { client, apiSend } = clientAnswering(category);
    const body = { key: 'fuel', labelAr: 'وقود' };
    await expect(expenseCategoryCalls(client).add(body)).resolves.toEqual(category);
    expect(apiSend).toHaveBeenCalledWith('POST', '/expense-categories', body);
  });

  it('refuses a list whose rows lack the active flag', async () => {
    const { client } = clientAnswering([{ key: 'fuel', label_ar: 'وقود', label_en: null }]);
    const failure = await expenseCategoryCalls(client)
      .list()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/expense-categories' } });
  });
});
