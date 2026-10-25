import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { lesson } from '@/features/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { StaffJoinButton } from './StaffJoinButton';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const L = lesson({ id: 'l-7', status: 'scheduled', starts_at: '2026-10-03T16:00:00.000Z', minutes: 60 });
const show = (l = L) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StaffJoinButton lesson={l} />
    </QueryClientProvider>,
  );

describe('StaffJoinButton «افتح الحلقة الآن»', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
    vi.useRealTimers();
  });

  it('before the window: the join button is off and «افتح الحلقة الآن» is offered', () => {
    show();
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: t.classroom.openNow })).toBeTruthy();
  });

  it('opening the room turns the join button on at once', async () => {
    apiSend.mockResolvedValue({ state: 'open', opens_at: '2026-10-03T14:00:00.000Z', closes_at: 'x', room_opened_at: '2026-10-03T14:00:00.000Z' });
    show();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.openNow }));
    const link = await screen.findByRole('link', { name: t.classroom.enter });
    expect(link.getAttribute('href')).toBe('/classroom/l-7');
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/room/open');
    expect(screen.queryByRole('button', { name: t.classroom.openNow })).toBeNull();
    expect(screen.getByText(t.classroom.openedHint)).toBeTruthy();
  });

  it('a room already opened (room_opened_at) needs no button', () => {
    show({ ...L, room_opened_at: '2026-10-03T13:30:00.000Z' });
    expect(screen.getByRole('link', { name: t.classroom.enter })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.openNow })).toBeNull();
  });

  it('shows why the room could not be opened', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_not_open' }));
    show();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.openNow }));
    expect(await screen.findByText(t.classroom.error.lesson_not_open)).toBeTruthy();
  });

  it('nothing for a cancelled lesson', () => {
    show({ ...L, status: 'cancelled_by_admin' });
    expect(screen.queryByText(t.classroom.enter)).toBeNull();
    expect(screen.queryByText(t.classroom.openNow)).toBeNull();
  });
});
