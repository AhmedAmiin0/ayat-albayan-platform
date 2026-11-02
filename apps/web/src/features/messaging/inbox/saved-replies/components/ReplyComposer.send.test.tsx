import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { PRICES, PROFILE, REPLIES } from '@/features/messaging/inbox/saved-replies/lib/fixture';
import { ReplyComposer } from './ReplyComposer';
import { setStaged } from '@/features/messaging/inbox/saved-replies/lib/staged-store';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;
const OPEN = { session_open: true, last_inbound_at: new Date().toISOString() };
const STAGED = { path: `out/u1/x/file.pdf`, filename: 'الأسعار.pdf' };

function show() {
  routeFetch(apiFetch, [
    ['/saved-replies', REPLIES],
    ['/me/profile', PROFILE],
  ]);
  renderWithClient(<ReplyComposer thread={thread(OPEN)} context={{}} leading={null} />);
}
const box = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
async function pickPrices() {
  fireEvent.change(box(), { target: { value: '/الأسعار' } });
  const [option] = within(await screen.findByRole('listbox')).getAllByRole('option');
  if (option) fireEvent.mouseDown(option);
}
const send = () => fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
const paths = () => apiSend.mock.calls.map((c) => `${String(c[0])} ${String(c[1])}`);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearDraft(PHONE);
  setStaged(PHONE, null);
});

describe('ReplyComposer: a reply\'s attachment', () => {
  it('shows as a chip that can be removed before sending', async () => {
    show();
    await pickPrices();
    expect(screen.getByText(S.staged, { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.stagedRemove.replace('{name}', 'الأسعار.pdf') }));
    expect(screen.queryByText('الأسعار.pdf')).toBeNull();
  });

  it('send: the text, then stage and the chat\'s own file send with its own request id', async () => {
    apiSend.mockImplementation(async (_m: string, path: string) => (path.endsWith('/stage') ? STAGED : message({ id: path })));
    show();
    await pickPrices();
    send();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(3));
    const enc = encodeURIComponent(PHONE);
    expect(paths()).toEqual([`POST /threads/${enc}/text`, `POST /saved-replies/${PRICES.id}/stage`, `POST /threads/${enc}/file`]);
    const stageId = (apiSend.mock.calls[1]?.[2] as { clientRequestId: string }).clientRequestId;
    expect(apiSend.mock.calls[2]?.[2]).toEqual({ clientRequestId: stageId, ...STAGED });
    expect((apiSend.mock.calls[0]?.[2] as { clientRequestId: string }).clientRequestId).not.toBe(stageId);
    await waitFor(() => expect(screen.queryByText('الأسعار.pdf')).toBeNull());
  });

  it('a failed file keeps the chip with the reason and a retry (same request id)', async () => {
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path.endsWith('/stage')) throw new ApiError(404, { code: 'saved_reply_not_found' });
      return message({ id: path });
    });
    show();
    await pickPrices();
    send();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(S.errors.saved_reply_not_found);
    apiSend.mockImplementation(async (_m: string, path: string) => (path.endsWith('/stage') ? STAGED : message({ id: path })));
    fireEvent.click(screen.getByRole('button', { name: S.web.retryFile }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(4));
    const ids = apiSend.mock.calls.filter((c) => String(c[1]).endsWith('/stage')).map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
    expect(ids[0]).toBe(ids[1]);
  });
});
