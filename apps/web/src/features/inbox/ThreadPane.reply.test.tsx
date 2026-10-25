import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, message, PHONE, template } from './testing/inbox-fixture';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const PATH = '/threads/%2B966501234567';
const ID = '6f1c1d3e-8c1a-4a57-9d0e-2b7f9a1c0e11';
const THEIRS = message({ id: ID, body: 'متى الحلقة؟\nسطر ثانٍ', replyable: true, forwardable: true });

function renderThread(open = true) {
  routeFetch(apiFetch, [
    [PATH, detail([THEIRS], { session_open: open, guardian_id: 'g-1' })],
    ['/messaging/templates', [template()]],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

const strip = () => screen.queryByRole('group', { name: t.inbox.reply.strip });
const box = () => screen.getByRole('textbox', { name: t.inbox.composer.messageLabel });

async function pickReply() {
  fireEvent.click(await screen.findByRole('button', { name: t.inbox.reply.action }));
  const s = strip();
  if (!s) throw new Error('no reply strip');
  return s;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«رد» in the chat (owner 2026-10-25)', () => {
  it('shows the strip with the sender and the first line, and focuses the box', async () => {
    renderThread();
    const s = await pickReply();
    expect(within(s).getByText('أم سهيلة')).toBeTruthy();
    expect(within(s).getByText('متى الحلقة؟')).toBeTruthy();
    expect(within(s).queryByText(/سطر ثانٍ/)).toBeNull();
    expect(document.activeElement).toBe(box());
  });

  it('✕ cancels it and gives the focus back to the box', async () => {
    renderThread();
    const s = await pickReply();
    fireEvent.click(within(s).getByRole('button', { name: t.inbox.reply.cancel }));
    expect(strip()).toBeNull();
    expect(document.activeElement).toBe(box());
  });

  it('the send answers the message (replyToMessageId); a sent answer clears the strip', async () => {
    renderThread();
    await pickReply();
    apiSend.mockResolvedValue(message({ id: 'm-out', direction: 'outbound', status: 'queued', body: 'الساعة الخامسة' }));
    fireEvent.change(box(), { target: { value: 'الساعة الخامسة' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    await waitFor(() => expect(strip()).toBeNull());
    expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/text`, {
      text: 'الساعة الخامسة',
      clientRequestId: expect.any(String),
      replyToMessageId: ID,
    });
  });

  it('a failed send keeps the strip', async () => {
    renderThread();
    await pickReply();
    apiSend.mockRejectedValue(new ApiError(500, { code: 'send_failed' }));
    fireEvent.change(box(), { target: { value: 'تمام' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    await screen.findByRole('alert');
    expect(strip()).toBeTruthy();
  });

  it('picked while the template toggle is on: the message box comes back with the strip', async () => {
    renderThread();
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.composer.modeTemplate }));
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
    await pickReply();
    expect(document.activeElement).toBe(box());
  });

  it('outside the 24 h window «رد» is off with the closed-window hint, and no strip', async () => {
    renderThread(false);
    const button = await screen.findByRole('button', { name: t.inbox.reply.action });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('title')).toBe(t.inbox.sessionClosed);
    // The reason as the button's own description, never a second (hidden) copy of the notice's text.
    expect(button.getAttribute('aria-description')).toBe(t.inbox.sessionClosed);
    fireEvent.click(button);
    expect(strip()).toBeNull();
  });
});
