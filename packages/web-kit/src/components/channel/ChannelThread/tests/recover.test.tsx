import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { channelMessage, channelPage } from '@ab/web-kit/components/channel/channel.fixtures';
import { showThread } from '@ab/web-kit/components/channel/thread.testing';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const box = () => screen.getByLabelText<HTMLTextAreaElement>(c.messageLabel);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('ChannelThread keeps what is on screen', () => {
  it('a failed re-read keeps the thread and the draft, with one inline line and «حاول مرة أخرى»', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue(channelMessage());
    const { client } = showThread('teacher');
    fireEvent.change(await screen.findByLabelText(c.messageLabel), { target: { value: 'مسودة' } });
    apiFetch.mockRejectedValue(new Error('down'));
    await act(() => client.refetchQueries({ queryKey: ['channel', 'teacher', 's1'] }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(c.loadFailed)).toBeTruthy();
    expect(screen.getByText('غدًا إن شاء الله')).toBeTruthy();
    expect(box().value).toBe('مسودة');
    apiFetch.mockResolvedValue(channelPage());
    fireEvent.click(screen.getByRole('button', { name: c.retry }));
    await waitFor(() => expect(screen.queryByText(c.loadFailed)).toBeNull());
  });

  it('the first read failing: the whole error state', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    showThread('teacher');
    expect(await screen.findByText(c.loadFailed)).toBeTruthy();
    expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
  });

  it('text typed during a send stays; only what was sent is cleared', async () => {
    apiFetch.mockResolvedValue(channelPage());
    let stored: (v: unknown) => void = () => undefined;
    apiSend.mockImplementation((_m: string, path: string) =>
      path.endsWith('/messages') ? new Promise((resolve) => (stored = resolve)) : Promise.resolve({}),
    );
    showThread('portal');
    fireEvent.change(await screen.findByLabelText(c.messageLabel), { target: { value: 'السلام' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    // My pending row shows at once with its sending line.
    expect(await screen.findByText(c.sending)).toBeTruthy();
    fireEvent.change(box(), { target: { value: 'السلام عليكم' } });
    await act(async () => stored(channelMessage({ body: 'السلام', mine: true })));
    await waitFor(() => expect(box().value).toBe('عليكم'));
  });

  it('a hidden tab does not mark read; shown again, it marks', async () => {
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue(channelMessage());
    showThread('portal');
    await screen.findByText('غدًا إن شاء الله');
    expect(apiSend).not.toHaveBeenCalled();
    state.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const read = { at: '2026-10-27T10:05:00.000Z' };
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/channel/read', read),
    );
  });

  it('a closed chat says why (closed_reason)', async () => {
    apiFetch.mockResolvedValue(
      channelPage({ open: false, messages: [], closed_reason: 'no_teacher' }),
    );
    showThread('portal');
    expect(await screen.findByText(c.closedReasons.no_teacher)).toBeTruthy();
  });
});
