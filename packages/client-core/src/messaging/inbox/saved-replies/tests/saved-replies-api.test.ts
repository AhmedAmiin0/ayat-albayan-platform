import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { savedReplyCalls } from '../saved-replies-api';

const ID = 'e1111111-1111-4111-8111-111111111111';
const PATH = `/saved-replies/${ID}`;
const REPLY = {
  id: ID,
  scope: 'mine',
  title: 'الأسعار',
  body: 'السعر مرفق',
  attachment: null,
  position: 1,
  updated_at: '2026-11-27T03:00:00.000Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('saved reply calls', () => {
  it('reads both lists', async () => {
    const { client, apiFetch } = clientAnswering([REPLY]);
    await expect(savedReplyCalls(client).all()).resolves.toEqual([REPLY]);
    expect(apiFetch).toHaveBeenCalledWith('/saved-replies');
  });

  it('creates, edits and moves a reply on the paths of today', async () => {
    const { client, apiSend } = clientAnswering(REPLY);
    const calls = savedReplyCalls(client);
    await expect(calls.create({ scope: 'mine', title: 'ق', body: 'ب' })).resolves.toEqual(REPLY);
    await calls.update({ id: ID, body: { attachment: null } });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/saved-replies', { scope: 'mine', title: 'ق', body: 'ب' }],
      ['PATCH', PATH, { attachment: null }],
    ]);
  });

  it('answers both lists after a move', async () => {
    const { client, apiSend } = clientAnswering([REPLY]);
    await expect(savedReplyCalls(client).move({ id: ID, direction: 'up' })).resolves.toEqual([
      REPLY,
    ]);
    expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/move`, { direction: 'up' });
  });

  it('deletes a reply with no body', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await savedReplyCalls(client).remove(ID);
    expect(apiSend).toHaveBeenCalledWith('DELETE', PATH, undefined);
  });

  it('stages the attachment and signs an upload', async () => {
    const staged = { path: 'chat/u/x.pdf', filename: 'x.pdf' };
    const signed = { bucket: 'chat', path: 'saved/u/x.pdf', token: 't', signed_url: 'https://s' };
    const request = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const stage = clientAnswering(staged);
    await savedReplyCalls(stage.client).stage({ id: ID, clientRequestId: request });
    expect(stage.apiSend).toHaveBeenCalledWith('POST', `${PATH}/stage`, {
      clientRequestId: request,
    });
    const upload = clientAnswering(signed);
    const body = { mime: 'application/pdf' as const, size: 10 };
    await expect(savedReplyCalls(upload.client).uploadUrl(body)).resolves.toEqual(signed);
    expect(upload.apiSend).toHaveBeenCalledWith(
      'POST',
      '/saved-replies/attachment-upload-url',
      body,
    );
  });

  it('throws bad_response for a reply without its scope', async () => {
    const { client } = clientAnswering([{ ...REPLY, scope: undefined }]);
    const failure = await savedReplyCalls(client)
      .all()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
