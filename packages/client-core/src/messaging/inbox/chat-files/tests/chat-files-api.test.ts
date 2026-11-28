import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { chatFileCalls } from '../chat-files-api';

const ID = 'b1111111-1111-4111-8111-111111111111';
const PHONE = '+966500000001';
const CHAT = `/threads/${encodeURIComponent(PHONE)}`;
const SIGNED = { url: 'https://files.test/a.jpg?token=t', expires_at: '2026-11-27T12:00:00.000Z' };
const FILE = { ...SIGNED, mime: 'image/jpeg' };
const ITEM = {
  message_id: ID,
  created_at: '2026-11-20T09:30:00.000Z',
  mime: 'image/jpeg',
  caption: null,
  expired: false,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('chat file calls', () => {
  it("reads a bubble's file, and signs it to save when asked, on the paths of today", async () => {
    const { client, apiFetch } = clientAnswering(FILE);
    const calls = chatFileCalls(client);
    await expect(calls.file({ phone: PHONE, messageId: ID })).resolves.toEqual(FILE);
    await calls.download({ phone: PHONE, messageId: ID });
    expect(apiFetch.mock.calls).toEqual([
      [`${CHAT}/messages/${ID}/file`],
      [`${CHAT}/messages/${ID}/file?download=1`],
    ]);
  });

  it('reads one page of a PDF with its count and size', async () => {
    const page = { ...SIGNED, page: 2, pages: 5, bytes: 9000 };
    const { client, apiFetch } = clientAnswering(page);
    const answer = chatFileCalls(client).pdfPage({ phone: PHONE, messageId: ID, page: 2 });
    await expect(answer).resolves.toEqual(page);
    expect(apiFetch.mock.calls).toEqual([[`${CHAT}/messages/${ID}/pdf/2`]]);
  });

  it("reads the invoice picker's files and one of them signed", async () => {
    const { client, apiFetch } = clientAnswering([ITEM]);
    await expect(chatFileCalls(client).media({ phone: PHONE })).resolves.toEqual([ITEM]);
    const signed = clientAnswering(FILE);
    await chatFileCalls(signed.client).mediaFile({ phone: PHONE, messageId: ID });
    expect(apiFetch.mock.calls).toEqual([[`${CHAT}/media`]]);
    expect(signed.apiFetch.mock.calls).toEqual([[`${CHAT}/media/${ID}`]]);
  });

  it('refuses a file with no type and a picker item with no flag', async () => {
    const noMime = chatFileCalls(clientAnswering(SIGNED).client);
    await expect(noMime.file({ phone: PHONE, messageId: ID })).rejects.toBeInstanceOf(ApiError);
    const { expired: _gone, ...noFlag } = ITEM;
    const bad = chatFileCalls(clientAnswering([noFlag]).client);
    await expect(bad.media({ phone: PHONE })).rejects.toBeInstanceOf(ApiError);
  });
});
