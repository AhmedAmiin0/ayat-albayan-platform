import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from '../../ChatActionsProvider';
import { message, PHONE, thread } from '../../testing/inbox-fixture';
import { MessageLog } from '../components/MessageLog';
import { renderWithClient, routeFetch } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const M = message({ id: 'b3f0e7a2-5d1c-4e8b-9a6f-0c2d4e6f8a10', body: 'رابط الحلقة', replyable: true, forwardable: true });
const phoneOf = (i: number) => `+96650000000${i}`;
// The open chat itself plus seven others, recent first; the 2nd is outside its window.
const CHATS = [thread(), ...Array.from({ length: 7 }, (_, i) => thread({ phone_e164: phoneOf(i), display_name: `محادثة ${i}`, session_open: i !== 1 }))];
const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };

async function openDialog() {
  routeFetch(apiFetch, [['/threads?', { items: CHATS, total: CHATS.length, page: 1, pageSize: 30 }]]);
  const client = renderWithClient(
    <ChatActionsProvider thread={thread()} enabled>
      <MessageLog {...base} messages={[M]} />
    </ChatActionsProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));
  fireEvent.click(screen.getByRole('button', { name: t.inbox.forward.action }));
  const dialog = await screen.findByRole('dialog', { name: t.inbox.forward.title });
  await within(dialog).findByText('محادثة 0');
  return { dialog, client };
}

const box = (dialog: HTMLElement, i: number) => within(dialog).getByRole('checkbox', { name: new RegExp(`محادثة ${i}`) });
const count = (n: number) => t.inbox.forward.selected.replace('{count}', String(n)).replace('{max}', '5');

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«إعادة توجيه» (owner 2026-10-25)', () => {
  it('lists the other chats recent first, with the closed-window hint, and caps the picks at five', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).queryByRole('checkbox', { name: /أم سهيلة/ })).toBeNull(); // not the chat itself
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7);
    expect(box(dialog, 1).getAttribute('aria-describedby')).toBeTruthy();
    expect(within(dialog).getByText(t.inbox.forward.skip.session_closed)).toBeTruthy();
    for (const i of [0, 1, 2, 3, 4]) fireEvent.click(box(dialog, i));
    expect(within(dialog).getByText(count(5))).toBeTruthy();
    expect(within(dialog).getByText(t.inbox.forward.max.replace('{max}', '5'))).toBeTruthy();
    expect((box(dialog, 5) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(box(dialog, 4));
    expect((box(dialog, 5) as HTMLInputElement).disabled).toBe(false);
    expect(within(dialog).getByText(count(4))).toBeTruthy();
  });

  it('the search asks GET /threads with it (debounced)', async () => {
    const { dialog } = await openDialog();
    fireEvent.change(within(dialog).getByRole('searchbox', { name: t.inbox.forward.search }), { target: { value: 'خالد' } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining(`search=${encodeURIComponent('خالد')}`)));
  });

  it('sends the POST body in pick order and toasts sent / skipped with the reason', async () => {
    const { dialog, client } = await openDialog();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(box(dialog, 2));
    fireEvent.click(box(dialog, 1));
    apiSend.mockResolvedValue({
      results: [
        { phone: phoneOf(2), sent: true, message_id: 'x' },
        { phone: phoneOf(1), sent: false, reason: 'session_closed' },
      ],
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t.inbox.forward.send }));
    const toast = await screen.findByRole('status');
    expect(apiSend).toHaveBeenCalledWith('POST', '/threads/forward', {
      messageId: M.id,
      targets: [phoneOf(2), phoneOf(1)],
      clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(toast.textContent).toContain(t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '1'));
    expect(toast.textContent).toContain(`محادثة 1: ${t.inbox.forward.skip.session_closed}`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['threads'] });
  });

  it('an error keeps the dialog with the error line; the retry reuses the request id', async () => {
    const { dialog } = await openDialog();
    fireEvent.click(box(dialog, 0));
    apiSend.mockRejectedValue(new ApiError(500, { code: 'internal' }));
    fireEvent.click(within(dialog).getByRole('button', { name: t.inbox.forward.send }));
    expect((await within(dialog).findByRole('alert')).textContent).toContain(t.inbox.forward.error);
    fireEvent.click(within(dialog).getByRole('button', { name: t.inbox.forward.send }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    const ids = apiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
    expect(ids[0]).toBe(ids[1]);
  });
});
