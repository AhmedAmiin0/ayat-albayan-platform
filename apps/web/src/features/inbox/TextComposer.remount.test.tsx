import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { clearAllDrafts } from './draft-store';
import { message, PHONE } from './inbox-fixture';
import { clearOwnSends, lastOwnSend } from './own-send';
import { TextComposer } from './TextComposer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

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
const sentBody = (call: number) => apiSend.mock.calls[call]?.[2] as { text: string; clientRequestId: string };

afterEach(() => {
  apiSend.mockReset();
  clearAllDrafts();
  clearOwnSends();
});

describe('TextComposer: a remounted box never replays a send (rule 8)', () => {
  it('pending → remount («قالب» twice) → other text: blocked until the first answers, then a new id, draft kept', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const first = show();
    type('الأولى');
    fireEvent.click(button());
    first.unmount();
    show();
    type('الثانية');
    expect(button().disabled).toBe(true); // that chat's send is still in flight
    resolve(message({ id: 'm-1', direction: 'outbound', status: 'sent' }));
    await waitFor(() => expect(button().disabled).toBe(false));
    expect(box().value).toBe('الثانية'); // the old box's success never wipes it
    expect(lastOwnSend(PHONE)).toBe('m-1');
    apiSend.mockResolvedValueOnce(message({ id: 'm-2', direction: 'outbound', status: 'sent' }));
    fireEvent.click(button());
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(sentBody(1).text).toBe('الثانية');
    expect(sentBody(1).clientRequestId).not.toBe(sentBody(0).clientRequestId);
  });

  it('a send that fails after a remount puts the text back in the new box', async () => {
    let reject: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    const first = show();
    type('السلام عليكم');
    fireEvent.click(button());
    first.unmount();
    show();
    reject(new ApiError(500, null));
    await waitFor(() => expect(box().value).toBe('السلام عليكم'));
  });

  it('a failed send, then edited text → a new id; the same text again → the failed id', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    show();
    type('السلام عليكم');
    fireEvent.click(button());
    await screen.findByRole('alert');
    type('السلام عليكم ورحمة الله');
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    fireEvent.click(button());
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(sentBody(1).clientRequestId).not.toBe(sentBody(0).clientRequestId);
    await waitFor(() => expect(button().disabled).toBe(false));
    apiSend.mockResolvedValueOnce(message({ id: 'm-3', direction: 'outbound', status: 'sent' }));
    fireEvent.click(button());
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(3));
    expect(sentBody(2).text).toBe('السلام عليكم ورحمة الله');
    expect(sentBody(2).clientRequestId).toBe(sentBody(1).clientRequestId);
  });
});
