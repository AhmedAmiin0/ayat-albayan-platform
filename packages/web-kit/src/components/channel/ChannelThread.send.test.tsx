import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { ChannelThread } from './ChannelThread';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const MESSAGES = '/portal/students/s1/channel/messages';
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const thread = (studentId: string) => (
  <ChannelThread refs={{ audience: 'portal', studentId }} tz="Asia/Riyadh" />
);
const box = () => screen.getByLabelText<HTMLTextAreaElement>(c.messageLabel);
const typeAndSend = (text: string) => {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: c.send }));
};
/** The client_id of each POST …/messages so far. */
const sentIds = (): unknown[] =>
  apiSend.mock.calls
    .filter(([, path]) => path === MESSAGES)
    .map(([, , body]) => (body as { client_id: unknown }).client_id);

describe('ChannelThread send: client_id and the draft per chat (review 2026-11-17)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    sessionStorage.clear();
  });

  it('a retry of the failed text reuses its client_id; the next text gets a new one', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    render(<QueryClientProvider client={client()}>{thread('s1')}</QueryClientProvider>);
    await screen.findByLabelText(c.messageLabel);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    apiSend.mockRejectedValueOnce(new Error('offline'));
    typeAndSend('شكرًا');
    expect(await screen.findByText(c.sendFailed)).toBeTruthy();
    expect(box().value).toBe('شكرًا');
    typeAndSend('شكرًا');
    await waitFor(() => expect(sentIds()).toHaveLength(2));
    await waitFor(() => expect(box().value).toBe(''));
    typeAndSend('شكرًا');
    await waitFor(() => expect(sentIds()).toHaveLength(3));
    const [first, retry, next] = sentIds();
    expect(retry).toBe(first);
    expect(next).not.toBe(first);
  });

  it('switching the student never carries one chat’s text to another', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    const qc = client();
    const view = render(<QueryClientProvider client={qc}>{thread('s1')}</QueryClientProvider>);
    fireEvent.change(await screen.findByLabelText(c.messageLabel), {
      target: { value: 'مسودة سلمى' },
    });
    view.rerender(<QueryClientProvider client={qc}>{thread('s2')}</QueryClientProvider>);
    await waitFor(() => expect(box().value).toBe(''));
    view.rerender(<QueryClientProvider client={qc}>{thread('s1')}</QueryClientProvider>);
    await waitFor(() => expect(box().value).toBe('مسودة سلمى'));
  });
});
