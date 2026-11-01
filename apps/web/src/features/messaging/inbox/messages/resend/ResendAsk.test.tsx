import type { MessageView } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from '@/features/messaging/inbox/shared/ChatActionsProvider';
import { message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ResendAsk } from './ResendAsk';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

// Meta's 131060 on a new number's first message (owner 2026-10-27): «اطلب إعادة الإرسال».
const unavailable = message({
  direction: 'inbound',
  body: null,
  interactive_payload: { type: 'unsupported', errors: [{ code: 131060, title: 'This message is unavailable.' }] },
});

function show(m: MessageView, opts: { enabled?: boolean; open?: boolean } = {}) {
  renderWithClient(
    <ChatActionsProvider thread={thread({ session_open: opts.open ?? true })} enabled={opts.enabled ?? true}>
      <ResendAsk message={m} />
    </ChatActionsProvider>,
  );
}
const ask = () => screen.queryByRole('button', { name: t.inbox.resend.action });

beforeEach(() => {
  apiSend.mockReset();
});

describe('ResendAsk', () => {
  it('shows on 131060 only, in a chat she may write in, inside the 24 h window', () => {
    show(unavailable);
    expect(ask()).toBeTruthy();
  });

  it('hidden in teacher mode, with the window closed, and for another unsupported or a normal row', () => {
    show(unavailable, { enabled: false });
    show(unavailable, { open: false });
    show({ ...unavailable, interactive_payload: { type: 'unsupported', errors: [{ code: 131051 }] } });
    show(message({ direction: 'inbound', body: 'السلام عليكم' }));
    expect(ask()).toBeNull();
  });

  it('the dialog shows the exact Arabic text; «أرسل» sends it once, a double click included', async () => {
    let answer: (row: unknown) => void = () => undefined;
    apiSend.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    show(unavailable);
    fireEvent.click(ask() ?? document.body);
    expect(screen.getByTestId('resend-text').textContent).toBe(ar.inbox.resend.text);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.resend.send }));
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.resend.sending }));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith('POST', `/threads/${encodeURIComponent(PHONE)}/text`, {
      text: ar.inbox.resend.text,
      clientRequestId: expect.any(String),
    });
    answer(message({ id: 'srv', direction: 'outbound', body: ar.inbox.resend.text }));
    await waitFor(() => expect(screen.queryByTestId('resend-text')).toBeNull());
  });

  it('a refused send keeps the dialog with the reason, and the same clientRequestId on «أرسل» again', async () => {
    apiSend.mockRejectedValue(new Error('offline'));
    show(unavailable);
    fireEvent.click(ask() ?? document.body);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.resend.send }));
    expect(await screen.findByText(t.inbox.error.send_failed)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.resend.send }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    const ids = apiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
    expect(ids[0]).toBe(ids[1]);
  });
});
