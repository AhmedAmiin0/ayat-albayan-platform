import { aMessageView } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { chatFileCalls } from '../chat-files-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966500000001';
const CHAT = `/threads/${encodeURIComponent(PHONE)}`;
const SIGNED = { bucket: 'wa-media', path: 'out/a.pdf', token: 't', signed_url: 'https://s.test/a' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('chat file send calls', () => {
  it('asks the signed upload on the path of today and reads it', async () => {
    const { client, apiSend } = clientAnswering(SIGNED);
    const body = { clientRequestId: ID, mime: 'application/pdf' as const, size: 1200 };
    const answer = chatFileCalls(client).uploadUrl({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(SIGNED);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/file-upload-url`, body]]);
  });

  it('sends the uploaded file and reads the sent message', async () => {
    const sent = aMessageView({ media_mime: 'application/pdf' });
    const { client, apiSend } = clientAnswering(sent);
    const body = { clientRequestId: ID, path: SIGNED.path, filename: 'a.pdf' };
    const answer = chatFileCalls(client).send({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/file`, body]]);
  });

  it('refuses an upload with no signed url and a send with no message', async () => {
    const upload = chatFileCalls(clientAnswering({ path: 'x' }).client).uploadUrl({
      params: { phone: PHONE },
      body: { clientRequestId: ID, mime: 'image/png', size: 1 },
    });
    await expect(upload).rejects.toBeInstanceOf(ApiError);
    const send = chatFileCalls(clientAnswering({}).client).send({
      params: { phone: PHONE },
      body: { clientRequestId: ID, path: 'p', filename: 'a.png' },
    });
    await expect(send).rejects.toBeInstanceOf(ApiError);
  });
});
