import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { joinMeeting } from '@/features/meetings/internal-api';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { fakeClient } from './fake-client';
import { StaffClassroomPage } from './StaffClassroomPage';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

function open() {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StaffClassroomPage lessonId="m-1" join={joinMeeting} make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}

describe('StaffClassroomPage for an internal meeting (/meeting/:id)', () => {
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
  });

  it('joins through the meeting route and connects the same room UI', async () => {
    apiSend.mockResolvedValue({ url: 'wss://lk', token: 'm', room: 'meeting-m-1', role: 'teacher' });
    const client = open();
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'm'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/meetings/m-1/join');
  });

  it('410 meeting_ended is worded', async () => {
    apiSend.mockRejectedValue(new ApiError(410, { code: 'meeting_ended', message: 'meeting_ended' }));
    open();
    expect(await screen.findByText(t.classroom.error.meeting_ended)).toBeTruthy();
  });
});
