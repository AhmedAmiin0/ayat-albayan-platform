import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { teacherEarningCalls } from '../teacher-earnings-api';

const TEACHER = '00000000-0000-4000-8000-00000000000a';
const PAYMENT = '00000000-0000-4000-8000-00000000000b';
const paid = {
  id: PAYMENT,
  teacher_id: TEACHER,
  amount: 120,
  currency: 'EGP',
  method: 'cash',
  paid_at: '2026-10-01T08:00:00.000Z',
  note: 'October',
  has_receipt: true,
  payout_id: null,
  sessions: 4,
  voided_at: null,
  void_reason: null,
};
const page = { items: [paid], total: 1, page: 2, pageSize: 20 };
const totals = { earned: 120, paid: 120, outstanding: 0, overpaid: 0, sessions: 4 };
const balance = {
  ...totals,
  unpaid_sessions: 0,
  teacher: { id: TEACHER, display_name_ar: 'T' },
  currency: 'EGP',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('teacherEarningCalls: one named teacher', () => {
  it('reads a named teacher under /teacher-earnings/:teacherId', async () => {
    const { client, apiFetch } = clientAnswering(balance);
    await expect(teacherEarningCalls(client).balance(TEACHER)).resolves.toEqual(balance);
    expect(apiFetch).toHaveBeenCalledWith(`/teacher-earnings/${TEACHER}`);
  });

  it('reads a named teacher payments with the query', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const query = { sort: 'amount', page: 2, pageSize: 20 } as const;
    await expect(teacherEarningCalls(client).payments(TEACHER, query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      `/teacher-earnings/${TEACHER}/payments?sort=amount&page=2&pageSize=20`,
    );
  });

  it('reads a receipt through the admin path', async () => {
    const link = { url: 'https://files.example/r.pdf', expires_at: '2026-10-01T08:05:00Z' };
    const { client, apiFetch } = clientAnswering(link);
    await expect(teacherEarningCalls(client).receipt(PAYMENT)).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenCalledWith(`/teacher-earnings/payments/${PAYMENT}/receipt`);
  });

  it('refuses a balance without its teacher', async () => {
    const { client } = clientAnswering(totals);
    const failure = await teacherEarningCalls(client)
      .balance(TEACHER)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('teacherEarningCalls: admin writes', () => {
  it('records a payment with POST /teacher-earnings/:teacherId/payments', async () => {
    const { client, apiSend } = clientAnswering({ payment: paid, replayed: true });
    const body = {
      amount: 120,
      method: 'cash' as const,
      paidAt: '2026-10-01T08:00:00.000Z',
      receiptPath: null,
      note: null,
      clientRequestId: '00000000-0000-4000-8000-00000000000c',
    };
    const answer = await teacherEarningCalls(client).record(TEACHER, body);
    expect(answer.replayed).toBe(true);
    expect(apiSend).toHaveBeenCalledWith('POST', `/teacher-earnings/${TEACHER}/payments`, body);
  });

  it('voids with POST /teacher-earnings/payments/:id/void and its reason', async () => {
    const voided = { ...paid, voided_at: '2026-10-02T08:00:00.000Z', void_reason: 'twice' };
    const { client, apiSend } = clientAnswering(voided);
    await expect(teacherEarningCalls(client).voidPayment(PAYMENT, 'twice')).resolves.toEqual(voided);
    expect(apiSend).toHaveBeenCalledWith('POST', `/teacher-earnings/payments/${PAYMENT}/void`, {
      reason: 'twice',
    });
  });

  it('asks for a receipt slot with POST /teacher-earnings/:teacherId/receipt-upload-url', async () => {
    const slot = { bucket: 'receipts', path: 'teachers/a.pdf', token: 't', signed_url: 'u' };
    const { client, apiSend } = clientAnswering(slot);
    const body = { mime: 'application/pdf' as const, size: 10 };
    const answer = teacherEarningCalls(client).receiptUploadUrl(TEACHER, body);
    await expect(answer).resolves.toEqual(slot);
    expect(apiSend).toHaveBeenCalledWith(
      'POST',
      `/teacher-earnings/${TEACHER}/receipt-upload-url`,
      body,
    );
  });
});
