import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { expenseCalls } from '../expenses-api';

const ID = '00000000-0000-4000-8000-000000000001';
const expense = {
  id: ID,
  month: '2026-11',
  category: 'rent',
  amount: 1500,
  currency: 'EGP',
  note: null,
  created_at: '2026-11-02T10:00:00.000Z',
  paid_on: null,
  vendor: null,
  method: null,
  has_receipt: false,
  recurring: false,
  is_draft: false,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('expenseCalls: reads', () => {
  it('reads a month with GET /expenses?month=', async () => {
    const { client, apiFetch } = clientAnswering([expense]);
    await expect(expenseCalls(client).list({ month: '2026-11' })).resolves.toEqual([expense]);
    expect(apiFetch).toHaveBeenCalledWith('/expenses?month=2026-11');
  });

  it('reads the year table with GET /expenses/year?year=', async () => {
    const year = {
      year: '2026',
      currency: 'EGP',
      months: [],
      categories: [],
      total: 0,
      fx_missing: [],
      fx_date: null,
    };
    const { client, apiFetch } = clientAnswering(year);
    await expect(expenseCalls(client).year('2026')).resolves.toEqual(year);
    expect(apiFetch).toHaveBeenCalledWith('/expenses/year?year=2026');
  });

  it('reads a receipt link with GET /expenses/:id/receipt', async () => {
    const link = { url: 'https://files.example/r.pdf', expires_at: '2026-11-02T10:05:00Z' };
    const { client, apiFetch } = clientAnswering(link);
    await expect(expenseCalls(client).receipt(ID)).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenCalledWith(`/expenses/${ID}/receipt`);
  });

  it('refuses a month whose rows lack the draft flag', async () => {
    const { client } = clientAnswering([{ ...expense, is_draft: undefined }]);
    const failure = await expenseCalls(client)
      .list({ month: '2026-11' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('expenseCalls: writes', () => {
  it('creates with POST /expenses', async () => {
    const { client, apiSend } = clientAnswering(expense);
    const body = { category: 'rent', amount: 1500, month: '2026-11' };
    await expect(expenseCalls(client).create(body)).resolves.toEqual(expense);
    expect(apiSend).toHaveBeenCalledWith('POST', '/expenses', body);
  });

  it('patches with PATCH /expenses/:id', async () => {
    const { client, apiSend } = clientAnswering(expense);
    await expect(expenseCalls(client).update(ID, { isDraft: false })).resolves.toEqual(expense);
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/expenses/${ID}`, { isDraft: false });
  });

  it('deletes with DELETE /expenses/:id and answers nothing', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(expenseCalls(client).remove(ID)).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('DELETE', `/expenses/${ID}`, undefined);
  });

  it('asks for a receipt slot with POST /expenses/receipt-upload-url', async () => {
    const slot = { bucket: 'receipts', path: 'expenses/a.pdf', token: 't', signed_url: 'u' };
    const { client, apiSend } = clientAnswering(slot);
    const body = { mime: 'application/pdf' as const, size: 10 };
    await expect(expenseCalls(client).receiptUploadUrl(body)).resolves.toEqual(slot);
    expect(apiSend).toHaveBeenCalledWith('POST', '/expenses/receipt-upload-url', body);
  });
});
