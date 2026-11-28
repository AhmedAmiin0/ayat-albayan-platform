import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { bookingExtraCalls } from './booking-extras-api';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const MISSED = {
  lesson_id: 'l-1',
  starts_at: '2026-09-13T14:00:00.000Z',
  status: 'no_show',
  duration_min: 30,
  teacher: { id: 't-1', display_name_ar: 'فاطمة' },
};
const SIGNED = { bucket: 'invoices', path: 'r/a.pdf', token: 'tok', signed_url: 'https://x' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('booking extra calls (R-SCH-10, R-PAY-03)', () => {
  it("reads a student's missed lessons by the query string", async () => {
    const { client, apiFetch } = clientAnswering([MISSED]);
    await expect(bookingExtraCalls(client).makeupCandidates(STUDENT)).resolves.toEqual([MISSED]);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/makeup-candidates?studentId=${STUDENT}`);
  });

  it('POSTs the invoice file facts and answers the signed upload', async () => {
    const { client, apiSend } = clientAnswering(SIGNED);
    const body = { clientRequestId: 'req-1', mime: 'application/pdf' as const, size: 7 };
    await expect(bookingExtraCalls(client).invoiceUploadUrl(body)).resolves.toEqual(SIGNED);
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/invoice-upload-url', body);
  });

  it('throws bad_response for a signed upload without its token', async () => {
    const { client } = clientAnswering({ bucket: 'invoices', path: 'r/a.pdf' });
    const body = { clientRequestId: 'req-1', mime: 'image/png' as const, size: 1 };
    const failure = await bookingExtraCalls(client)
      .invoiceUploadUrl(body)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
