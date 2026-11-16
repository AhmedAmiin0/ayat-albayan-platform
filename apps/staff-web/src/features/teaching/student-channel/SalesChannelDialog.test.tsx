import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { MonitorChannelButton } from './MonitorChannelButton';
import { SalesChannelDialog } from './SalesChannelDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  sessionStorage.clear();
});

describe('the owning assistant\'s chat panel', () => {
  it('Esc in the box leaves the box only; the draft survives closing and reopening', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    render(
      <QueryClientProvider client={client()}>
        <MonitorChannelButton studentId="s1" studentName="سلمى" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: c.open }));
    const box = await screen.findByLabelText<HTMLTextAreaElement>(c.messageLabel);
    fireEvent.change(box, { target: { value: 'مسودة لم تُرسل' } });
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: c.open }));
    const again = await screen.findByLabelText<HTMLTextAreaElement>(c.messageLabel);
    expect(again.value).toBe('مسودة لم تُرسل');
  });

  it('opened from a push (no row name): the thread names the student', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    render(
      <QueryClientProvider client={client()}>
        <SalesChannelDialog studentId="s1" onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'سلمى' })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/students/s1/channel/messages');
  });
});
