import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { reportAttachmentCalls } from '../report-attachment-api';

const ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';
const FILE_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const BASE = `/reports/${ID}/attachments`;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('report attachment calls', () => {
  it('asks for a slot and registers the file on the paths of today, with the same bodies', async () => {
    const slot = { bucket: 'report-attachments', path: `${ID}/a.png`, token: 't', signed_url: 'u' };
    const { client, apiSend } = clientAnswering(slot);
    const calls = reportAttachmentCalls(client);
    const meta = { mime: 'image/png' as const, size: 3 };
    await expect(calls.uploadUrl({ id: ID }, meta)).resolves.toEqual(slot);
    await expect(calls.register({ id: ID }, { ...meta, path: slot.path })).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
    expect(apiSend.mock.calls).toEqual([
      ['POST', `${BASE}/upload-url`, meta],
      ['POST', BASE, { ...meta, path: slot.path }],
    ]);
  });

  it('removes a file and reads its signed link on the paths of today', async () => {
    const link = { url: 'https://files.test/a.png', expires_at: '2026-11-20T18:00:00Z' };
    const { client, apiFetch, apiSend } = clientAnswering(link);
    const calls = reportAttachmentCalls(client);
    await expect(calls.url({ id: ID, attachmentId: FILE_ID })).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}/${FILE_ID}/url`);
    apiSend.mockResolvedValueOnce(undefined);
    await expect(calls.remove({ id: ID, attachmentId: FILE_ID })).resolves.toBeUndefined();
    expect(apiSend.mock.calls[0]?.slice(0, 2)).toEqual(['DELETE', `${BASE}/${FILE_ID}`]);
  });
});
