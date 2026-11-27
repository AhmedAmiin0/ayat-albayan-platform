import { aMessageView } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { stickerPanelCalls } from '../sticker-panel-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966500000001';
const CHAT = `/threads/${encodeURIComponent(PHONE)}`;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('sticker and GIF send calls', () => {
  it('sends a held sticker on the path of today and reads the sent message', async () => {
    const sent = aMessageView({ media_mime: 'image/webp' });
    const { client, apiSend } = clientAnswering(sent);
    const body = { messageId: ID, clientRequestId: ID };
    const answer = stickerPanelCalls(client).sticker({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/sticker`, body]]);
  });

  it('sends a GIF on the path of today and reads the sent message', async () => {
    const sent = aMessageView({ media_mime: 'video/mp4' });
    const { client, apiSend } = clientAnswering(sent);
    const body = { gifId: 'abc123', clientRequestId: ID };
    const answer = stickerPanelCalls(client).gif({ params: { phone: PHONE }, body });
    await expect(answer).resolves.toEqual(sent);
    expect(apiSend.mock.calls).toEqual([['POST', `${CHAT}/gif`, body]]);
  });

  it('refuses an answer that is no message', async () => {
    const calls = stickerPanelCalls(clientAnswering({}).client);
    const body = { gifId: 'abc123', clientRequestId: ID };
    await expect(calls.gif({ params: { phone: PHONE }, body })).rejects.toBeInstanceOf(ApiError);
  });
});
