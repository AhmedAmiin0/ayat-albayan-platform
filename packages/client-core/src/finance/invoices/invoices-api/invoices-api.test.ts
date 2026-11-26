import type { InvoiceView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { invoiceCalls } from './invoices-api';

const RULE = 'e1111111-1111-4111-8111-111111111111';
const INV = 'e3333333-3333-4333-8333-333333333333';
const invoice: InvoiceView = {
  id: INV,
  rule_id: RULE,
  kind: 'package',
  mime: 'image/png',
  size_bytes: 2048,
  source: 'upload',
  created_at: '2026-10-03T09:00:00.000Z',
  students: [{ id: 'e2222222-2222-4222-8222-222222222222', name: 'سهيلة', code: 'AB-0183' }],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('invoice calls (R-PAY-03)', () => {
  it("lists a booking's invoices from GET /invoices?ruleId", async () => {
    const { client, apiFetch } = clientAnswering([invoice]);
    await expect(invoiceCalls(client).list({ ruleId: RULE })).resolves.toEqual([invoice]);
    expect(apiFetch).toHaveBeenCalledWith(`/invoices?ruleId=${RULE}`);
  });

  it('reads the recent page with its filters in the query string', async () => {
    const page = { items: [{ ...invoice, payment_id: null }], total: 1, page: 2, pageSize: 25 };
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 25, kind: 'makeup', from: '2026-01-01' } as const;
    await expect(invoiceCalls(client).recent(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      '/invoices/recent?page=2&pageSize=25&kind=makeup&from=2026-01-01',
    );
  });

  it('asks for a signed download of one invoice', async () => {
    const signed = { url: 'https://files.example/a.png', expires_at: '2026-10-03T10:00:00Z' };
    const { client, apiFetch } = clientAnswering(signed);
    await expect(invoiceCalls(client).download(INV)).resolves.toEqual(signed);
    expect(apiFetch).toHaveBeenCalledWith(`/invoices/${INV}/download`);
  });

  it('throws bad_response for an answer that does not match the schema', async () => {
    const { client } = clientAnswering([{ ...invoice, kind: 'trial' }]);
    const error = await invoiceCalls(client).list({ ruleId: RULE }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response', path: '/invoices' } });
  });
});
