import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import {
  box,
  editBar,
  OWN,
  pickEdit,
  showChat,
} from '@/features/messaging/inbox/testing/correction-harness';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const c = t.inbox.correction;
const PATH = '/threads/%2B966501234567/text';
const bar = () => {
  const el = editBar();
  if (!el) throw new Error('no edit bar');
  return el;
};
const sendText = (text: string) => {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
};

afterEach(() => {
  apiSend.mockReset();
  clearTabMemories();
});

describe('«تعديل» in the text box (owner 2026-11-07)', () => {
  it('the bar shows the original’s first line and says the family gets a «تصحيح:» reply', () => {
    showChat();
    pickEdit();
    expect(within(bar()).getByText('The lesson is at five')).toBeTruthy();
    expect(within(bar()).queryByText(/See you then/)).toBeNull();
    expect(screen.getByText(c.note)).toBeTruthy();
  });

  it('✕ leaves edit mode, empties the box and gives the focus back to it', () => {
    showChat();
    pickEdit();
    fireEvent.click(within(bar()).getByRole('button', { name: c.cancel }));
    expect(editBar()).toBeNull();
    expect(box().value).toBe('');
    expect(document.activeElement).toBe(box());
  });

  it('the send carries correctsId (no replyToMessageId, no prefix); a sent one clears the bar', async () => {
    apiSend.mockResolvedValue(
      message({ id: 'fix', direction: 'outbound', status: 'queued', body: 'تصحيح: السادسة' }),
    );
    showChat();
    pickEdit();
    sendText('الحلقة الساعة السادسة');
    await waitFor(() => expect(editBar()).toBeNull());
    expect(apiSend).toHaveBeenCalledWith('POST', PATH, {
      text: 'الحلقة الساعة السادسة',
      clientRequestId: expect.any(String),
      correctsId: OWN.id,
    });
  });

  it('a refused correction keeps the bar and says why', async () => {
    apiSend.mockRejectedValue(new ApiError(403, { code: 'not_your_message' }));
    showChat();
    pickEdit();
    sendText('الساعة السادسة');
    expect((await screen.findByRole('alert')).textContent).toContain(c.errors.not_your_message);
    expect(editBar()).toBeTruthy();
  });

  it('«رد» and «تعديل» exclude each other', () => {
    showChat();
    pickEdit();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.action }));
    expect(editBar()).toBeNull();
    expect(screen.getByRole('group', { name: t.inbox.reply.strip })).toBeTruthy();
    pickEdit();
    expect(screen.queryByRole('group', { name: t.inbox.reply.strip })).toBeNull();
    expect(editBar()).toBeTruthy();
  });
});
