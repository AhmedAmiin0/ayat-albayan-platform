import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearDraft } from './draft-store';
import { message, PHONE } from './inbox-fixture';
import { TextComposer } from './TextComposer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

const OTHER = '+966507654321';
const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
const show = (phone: string) =>
  render(
    <QueryClientProvider client={client}>
      <TextComposer phone={phone} />
    </QueryClientProvider>,
  );
const box = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const send = () => fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
const requestIdOf = (call: number): unknown =>
  (apiSend.mock.calls[call]?.[2] as { clientRequestId: string }).clientRequestId;

afterEach(() => {
  apiSend.mockReset();
  clearDraft(PHONE);
  clearDraft(OTHER);
});

describe('TextComposer: the draft survives (W5)', () => {
  it('a thread switch keeps each chat’s draft', () => {
    const first = show(PHONE);
    type('مرحبًا');
    first.unmount();
    const other = show(OTHER);
    expect(box().value).toBe('');
    other.unmount();
    show(PHONE);
    expect(box().value).toBe('مرحبًا');
  });

  it('a failed send puts the text back, and the retry sends the same clientRequestId (rule 8)', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    show(PHONE);
    type('السلام عليكم');
    send();
    expect(box().value).toBe(''); // cleared at once
    await screen.findByRole('alert');
    expect(box().value).toBe('السلام عليكم');
    apiSend.mockResolvedValueOnce(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    send();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(requestIdOf(1)).toBe(requestIdOf(0));
  });

  it('text typed while the send is in flight is kept, and the next message gets a new key', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    show(PHONE);
    type('أ');
    send();
    type('ب');
    resolve(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: t.inbox.composer.send }).getAttribute('aria-busy'),
      ).toBeNull(),
    );
    expect(box().value).toBe('ب');
    apiSend.mockResolvedValueOnce(message({ id: 'm-2', direction: 'outbound', status: 'queued' }));
    send();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(requestIdOf(1)).not.toBe(requestIdOf(0));
  });

  it('a failed send never overwrites new typing', async () => {
    let reject: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
    show(PHONE);
    type('أ');
    send();
    type('ب');
    reject(new ApiError(500, null));
    await screen.findByRole('alert');
    expect(box().value).toBe('ب');
  });
});
