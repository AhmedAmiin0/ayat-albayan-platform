import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { ChannelThread } from './ChannelThread';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const show = (audience: 'teacher' | 'portal' | 'admin' | 'sales') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChannelThread refs={{ audience, studentId: 's1' }} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );

describe('ChannelThread (docs/31 §2)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a participant: oldest first, links clickable, «أنت» on mine, marks read, sends the trimmed text', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    show('portal');
    expect(await screen.findByRole('link', { name: 'https://example.org/plan' })).toBeTruthy();
    expect(screen.getByText(c.you)).toBeTruthy();
    expect(screen.getByText(`أم سلمى · ${c.roles.guardian}`)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages');
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/channel/read', { at: '2026-10-27T10:05:00.000Z' }));
    fireEvent.change(screen.getByLabelText(c.messageLabel), { target: { value: '  شكرًا  ' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/channel/messages', { body: 'شكرًا' }));
    expect(screen.queryByText(c.readOnly)).toBeNull();
  });

  it('a monitor: «للاطلاع فقط», no composer, nothing marked read', async () => {
    apiFetch.mockResolvedValue(channelPage({ read_only: true }));
    show('admin');
    expect(await screen.findByText(c.readOnly)).toBeTruthy();
    expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/channel/messages');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('over 2000 characters the send is refused with its line; a failed send says so', async () => {
    apiFetch.mockResolvedValue(channelPage({ messages: [] }));
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path.endsWith('/messages')) throw new Error('down');
      return {};
    });
    show('teacher');
    expect(await screen.findByText(c.empty)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(c.messageLabel), { target: { value: 'x'.repeat(2001) } });
    expect(screen.getByText(c.tooLong.replace('{n}', '2000'))).toBeTruthy();
    expect((screen.getByRole('button', { name: c.send }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(c.messageLabel), { target: { value: 'مرحبًا' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText(c.sendFailed)).toBeTruthy();
  });

  it('«الرسائل الأقدم» pages back by the oldest message shown', async () => {
    apiFetch.mockResolvedValueOnce(channelPage({ has_more: true }));
    apiFetch.mockResolvedValueOnce(channelPage({ messages: [{ id: 'm0', body: 'أقدم', sender_role: 'guardian', sender_name: '', mine: false, created_at: '2026-10-26T10:00:00.000Z', edited: false, deleted: false }] }));
    show('sales');
    fireEvent.click(await screen.findByRole('button', { name: c.older }));
    expect(await screen.findByText('أقدم')).toBeTruthy();
    expect(apiFetch).toHaveBeenLastCalledWith('/sales/students/s1/channel/messages?before=2026-10-27T10%3A00%3A00.000Z');
  });
});
