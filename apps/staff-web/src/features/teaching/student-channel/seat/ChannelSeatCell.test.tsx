import type { ChannelSeat } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { channelPage } from '@ab/web-kit/testing';
import { ChannelSeatCell } from './ChannelSeatCell';
import { OpenSeatChat } from './OpenSeatChat';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// Only one assistant may hold a student chat, and the student's bringer has priority.
const S = t.studentChannel.seat;
const SEAT = '/sales/students/s1/channel/seat';
const free: ChannelSeat = { holder: null, mine: false, bringer: false, canTake: true };
const mine: ChannelSeat = { holder: { id: 'p-a', name: 'سارة' }, mine: true, bringer: false, canTake: false };
const huda: ChannelSeat = { ...free, holder: { id: 'p-b', name: 'هدى' }, canTake: false };

const serve = (seat: ChannelSeat) =>
  apiFetch.mockImplementation(async (path: string) => (path === SEAT ? seat : channelPage()));

function show(seat: ChannelSeat, ui = <ChannelSeatCell studentId="s1" studentName="سلمى" />) {
  serve(seat);
  // The open thread marks itself read through apiSend; a test may override this answer.
  apiSend.mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ChannelSeatCell', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('held by another assistant: who follows it, no button', async () => {
    show(huda);
    expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('free: «تولَّ المحادثة» takes it (PUT) and the row then opens the chat', async () => {
    show(free);
    apiSend.mockImplementation(async () => {
      apiFetch.mockImplementation(async (path: string) => (path === SEAT ? mine : channelPage()));
      return mine;
    });
    fireEvent.click(await screen.findByRole('button', { name: S.take }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', SEAT, undefined));
    expect(await screen.findByRole('button', { name: t.studentChannel.open })).toBeTruthy();
  });

  it('taken first by another assistant (409): says so', async () => {
    show(free);
    apiSend.mockRejectedValue(new ApiError(409, { code: 'channel_seat_taken' }));
    fireEvent.click(await screen.findByRole('button', { name: S.take }));
    expect((await screen.findByRole('alert')).textContent).toBe(S.taken);
  });

  it('mine: the chat opens with «مغادرة المحادثة», which frees the seat (DELETE)', async () => {
    show(mine);
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(await screen.findByRole('button', { name: t.studentChannel.open }));
    expect(await screen.findByText('غدًا إن شاء الله')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.leave }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', SEAT, undefined));
  });

  it('my own student, held by a colleague: who, and «انقل المحادثة إليك» (PUT)', async () => {
    show({ ...huda, bringer: true, canTake: true });
    apiSend.mockResolvedValue(mine);
    expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.takeOver }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', SEAT, undefined));
  });

  it('taken over since the row was read: opening re-reads the seat and says who follows it', async () => {
    show(mine);
    const open = await screen.findByRole('button', { name: t.studentChannel.open });
    serve(huda);
    fireEvent.click(open);
    expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: S.leave })).toBeNull();
  });
});

describe('OpenSeatChat (a chat notification, ?student=)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('her seat: the chat opens at once, the thread naming the student', async () => {
    show(mine, <OpenSeatChat studentId="s1" onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: S.leave })).toBeTruthy();
    expect(await screen.findByText('غدًا إن شاء الله')).toBeTruthy();
  });

  it('not hers (taken over meanwhile): a short card says who follows it', async () => {
    show(huda, <OpenSeatChat studentId="s1" onClose={vi.fn()} />);
    expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: S.leave })).toBeNull();
  });
});
