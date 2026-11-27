import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesChatReceiptCalls } from '../chat-receipts-api';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const MESSAGE = '22222222-2222-4222-8222-222222222222';
const CHAT = '+966500000001';
const RECEIPT = {
  message_id: MESSAGE,
  created_at: '2026-11-27T10:00:00Z',
  mime: 'application/pdf',
  caption: 'receipt.pdf',
  expired: false,
};
const FILE = {
  url: 'https://files.example/t.jpg?t=1',
  expires_at: '2026-11-27T11:00:00Z',
  mime: 'image/jpeg',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales chat receipt calls', () => {
  it('lists her student’s receipts on the path of today, with the chat phone when given', async () => {
    const { client, apiFetch } = clientAnswering([RECEIPT]);
    const calls = salesChatReceiptCalls(client);
    await expect(calls.list({ studentId: STUDENT })).resolves.toEqual([RECEIPT]);
    await calls.list({ studentId: STUDENT, phone: CHAT });
    expect(apiFetch.mock.calls).toEqual([
      [`/sales/money/chat-receipts?studentId=${STUDENT}`],
      [`/sales/money/chat-receipts?studentId=${STUDENT}&phone=${encodeURIComponent(CHAT)}`],
    ]);
  });

  it('reads one file signed on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(FILE);
    const calls = salesChatReceiptCalls(client);
    await expect(calls.file({ studentId: STUDENT, messageId: MESSAGE })).resolves.toEqual(FILE);
    expect(apiFetch).toHaveBeenCalledWith(
      `/sales/money/chat-receipts/${MESSAGE}?studentId=${STUDENT}`,
    );
  });

  it('throws bad_response for a receipt row without its type', async () => {
    const { client } = clientAnswering([{ ...RECEIPT, mime: undefined }]);
    const failure = await salesChatReceiptCalls(client)
      .list({ studentId: STUDENT })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
