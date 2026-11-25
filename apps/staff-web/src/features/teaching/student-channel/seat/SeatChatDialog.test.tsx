import type { ChannelSeat } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { channelPage } from '@ab/web-kit/testing';
import { ChannelSeatCell } from './ChannelSeatCell';
import { OpenSeatChat } from './OpenSeatChat';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const SEAT = '/sales/students/s1/channel/seat';
const mine: ChannelSeat = {
  holder: { id: 'p-a', name: 'سارة' },
  mine: true,
  bringer: false,
  canTake: false,
};

function show(ui: React.ReactElement) {
  apiFetch.mockImplementation(async (path: string) => (path === SEAT ? mine : channelPage()));
  apiSend.mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  sessionStorage.clear();
});

describe('the seat holder\'s chat panel', () => {
  it('Esc in the box leaves the box only; the draft survives closing and reopening', async () => {
    show(<ChannelSeatCell studentId="s1" studentName="سلمى" />);
    fireEvent.click(await screen.findByRole('button', { name: c.open }));
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

  it('opened from a chat notification (no row name): the thread names the student', async () => {
    show(<OpenSeatChat studentId="s1" onClose={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'سلمى' })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/students/s1/channel/messages');
  });
});
