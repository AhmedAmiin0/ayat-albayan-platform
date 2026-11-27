import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesStudentFileCalls } from '../student-file-api';

const ID = '11111111-1111-4111-8111-111111111111';
const REPORT = '22222222-2222-4222-8222-222222222222';
const SIGNED = { url: 'https://files.example/r.pdf?t=1', expires_at: '2026-11-27T11:00:00Z' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales student file calls', () => {
  it('reads the signed report url on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(SIGNED);
    const calls = salesStudentFileCalls(client);
    await expect(calls.reportPdf({ studentId: ID, reportId: REPORT })).resolves.toEqual(SIGNED);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/students/${ID}/reports/${REPORT}/pdf`);
  });

  it('throws bad_response for an answer without a url', async () => {
    const { client } = clientAnswering({ expires_at: SIGNED.expires_at });
    const failure = await salesStudentFileCalls(client)
      .reportPdf({ studentId: ID, reportId: REPORT })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
