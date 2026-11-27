import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { reportCalls } from '../report-api';

const ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('report calls', () => {
  it('reads a report on the path of today and refuses a bad answer', async () => {
    const { client, apiFetch } = clientAnswering({});
    await expect(reportCalls(client).get({ id: ID })).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
    expect(apiFetch).toHaveBeenCalledWith(`/reports/${ID}`);
  });

  it('autosaves and sends both forms on the paths of today', async () => {
    const { client, apiSend } = clientAnswering({});
    const calls = reportCalls(client);
    await calls.draft({ id: ID }, { notes: 'x' }).catch(() => null);
    await calls.submit({ id: ID }, { expectedVersion: 1 }).catch(() => null);
    await calls.draftV2({ id: ID }, { notes: 'x' }).catch(() => null);
    await calls.submitV2({ id: ID }, { expectedVersion: 1, program: 'quran' }).catch(() => null);
    const asked = apiSend.mock.calls.map((c: unknown[]) => `${String(c[0])} ${String(c[1])}`);
    expect(asked).toEqual([
      `PUT /reports/${ID}/draft`,
      `POST /reports/${ID}/submit`,
      `PUT /reports/${ID}/v2/draft`,
      `POST /reports/${ID}/v2/submit`,
    ]);
  });

  it('asks for the pdf link and its retry on the paths of today', async () => {
    const link = { url: 'https://files.test/r.pdf', expires_at: '2026-11-20T18:00:00Z' };
    const { client, apiFetch, apiSend } = clientAnswering(link);
    await expect(reportCalls(client).pdf({ id: ID })).resolves.toEqual(link);
    await reportCalls(client).retryPdf({ id: ID }).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(`/reports/${ID}/pdf`);
    expect(apiSend.mock.calls[0]?.slice(0, 2)).toEqual(['POST', `/reports/${ID}/pdf/retry`]);
  });
});
