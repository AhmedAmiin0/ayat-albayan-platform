import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { fakeClient } from './fake-client';
import { StaffClassroomPage } from './StaffClassroomPage';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const JOIN = { url: 'wss://lk', token: 'staff', room: 'lesson-9', role: 'teacher' };

function open() {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StaffClassroomPage lessonId="l-9" make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}

describe('StaffClassroomPage', () => {
  afterEach(() => apiSend.mockReset());

  it('asks the API for a token, then connects the room with it', async () => {
    apiSend.mockResolvedValue(JOIN);
    const client = open();
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'staff'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-9/room/join');
  });

  it('too early: «تُفتح الساعة …» and a retry that asks again', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-03T15:45:00.000Z' }));
    const client = open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/\d{2}:\d{2}/);
    apiSend.mockResolvedValue(JOIN);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.retry }));
    await waitFor(() => expect(client.connect).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledTimes(2);
  });

  it.each([
    [410, 'join_closed'],
    [403, 'forbidden'],
    [503, 'classroom_not_configured'],
  ] as const)('%s %s is worded', async (status, code) => {
    apiSend.mockRejectedValue(new ApiError(status, { code, message: code }));
    open();
    expect(await screen.findByText(t.classroom.error[code])).toBeTruthy();
  });
});
