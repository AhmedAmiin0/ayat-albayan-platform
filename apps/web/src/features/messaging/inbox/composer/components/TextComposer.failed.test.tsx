import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearAllDrafts, getDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { clearOwnSends, lastOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { TextComposer } from './TextComposer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const show = () =>
  render(
    <QueryClientProvider client={client}>
      <TextComposer phone={PHONE} />
    </QueryClientProvider>,
  );
const box = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
const button = () => screen.getByRole<HTMLButtonElement>('button', { name: t.inbox.composer.send });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const sentId = (call: number) => (apiSend.mock.calls[call]?.[2] as { clientRequestId: string }).clientRequestId;
const sendAndWait = async (calls: number) => {
  fireEvent.click(button());
  await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(calls));
  await waitFor(() => expect(button().disabled).toBe(!box().value.trim()));
};

afterEach(() => {
  apiSend.mockReset();
  clearAllDrafts();
  clearOwnSends();
});

describe('TextComposer: a failed id never outlives its text (round 2 C)', () => {
  it('failed → other text sent fine → the first text much later gets a new id, not a replay', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    show();
    type('السلام عليكم');
    await sendAndWait(1);
    expect(getDraft(PHONE).failed?.text).toBe('السلام عليكم');
    type('موعد الحلقة غدًا');
    expect(getDraft(PHONE).failed).toBeNull(); // the box no longer holds the failed text
    apiSend.mockResolvedValueOnce(message({ id: 'm-2', direction: 'outbound', status: 'sent' }));
    await sendAndWait(2);
    apiSend.mockResolvedValueOnce(message({ id: 'm-3', direction: 'outbound', status: 'sent' }));
    type('السلام عليكم');
    await sendAndWait(3);
    expect(sentId(2)).not.toBe(sentId(0));
  });

  it('the failed text again (spaces aside) still reuses its id', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    show();
    type('السلام عليكم');
    await sendAndWait(1);
    type('السلام عليكم ');
    apiSend.mockResolvedValueOnce(message({ id: 'm-2', direction: 'outbound', status: 'sent' }));
    await sendAndWait(2);
    expect(sentId(1)).toBe(sentId(0));
    expect(getDraft(PHONE).failed).toBeNull();
  });
});

describe('TextComposer: a failure after a remount says why (round 2 H)', () => {
  it('the new box gets the text back with the reason, marked invalid; typing other text clears it', async () => {
    let reject: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    const first = show();
    type('السلام عليكم');
    fireEvent.click(button());
    first.unmount();
    show();
    reject(new ApiError(503, {}));
    expect((await screen.findByRole('alert')).textContent).toBe(t.inbox.error.send_failed);
    expect(box().value).toBe('السلام عليكم');
    expect(box().getAttribute('aria-invalid')).toBe('true');
    type('نص آخر');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('TextComposer: a stored session_closed is not shown again (round 3)', () => {
  it('the window reopened: the restored text comes back without «you need to send a template»', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(409, { code: 'session_closed' }));
    const first = show();
    type('السلام عليكم');
    fireEvent.click(button());
    await waitFor(() => expect(getDraft(PHONE).failed?.code).toBe('session_closed'));
    first.unmount();
    show();
    expect(box().value).toBe('السلام عليكم');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(box().getAttribute('aria-invalid')).not.toBe('true');
  });
});

describe('TextComposer: a send settling after sign-out writes nothing back (round 2 D)', () => {
  it('a failure after sign-out restores no draft', async () => {
    let reject: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    const view = show();
    type('رسالة خاصة');
    fireEvent.click(button());
    clearAllDrafts();
    clearOwnSends();
    view.unmount();
    reject(new ApiError(500, null));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(getDraft(PHONE)).toEqual({ text: '', failed: null });
  });

  it('a success after sign-out records no own send', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const view = show();
    type('رسالة خاصة');
    fireEvent.click(button());
    clearAllDrafts();
    clearOwnSends();
    view.unmount();
    resolve(message({ id: 'm-9', direction: 'outbound', status: 'sent' }));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(lastOwnSend(PHONE)).toBeUndefined();
  });
});
