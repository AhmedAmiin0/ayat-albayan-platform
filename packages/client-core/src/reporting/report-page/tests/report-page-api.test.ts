import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { reportPageCalls } from '../report-page-api';

const PUBLIC_ID = 'b'.repeat(32);
const REPORT_ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('report page calls', () => {
  it('opens a link by its public id on the path of today', async () => {
    const { client, apiFetch } = clientAnswering({});
    const asked = reportPageCalls(client).byPublicId({ publicId: PUBLIC_ID });
    await expect(asked).rejects.toBeInstanceOf(ApiError);
    expect(apiFetch).toHaveBeenCalledWith(`/report-pages/${PUBLIC_ID}`);
  });

  it('opens a list row by its report uuid on the path of today', async () => {
    const { client, apiFetch } = clientAnswering({});
    await expect(reportPageCalls(client).byReportId({ id: REPORT_ID })).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
    expect(apiFetch).toHaveBeenCalledWith(`/report-pages/by-report/${REPORT_ID}`);
  });
});
