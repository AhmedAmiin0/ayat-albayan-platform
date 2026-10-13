import type { MeetingInviteeView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { InviteeViewRow } from './InviteeViewRow';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const R = t.meetingInvites.results;
const ROW: MeetingInviteeView = {
  id: 'i-1', kind: 'student', display_name: 'سهيلة', channel: 'link', status: 'window_closed', error_code: 'chat_not_allowed', sent_at: null,
};
const idOf = (n: number): unknown => (apiSend.mock.calls[n]?.[2] as { clientRequestId?: string } | undefined)?.clientRequestId;

describe('InviteeViewRow «أعد الإرسال»', () => {
  afterEach(() => {
    cleanup();
    apiSend.mockReset();
  });

  it('a retry after a failure reuses the request id; a success starts a new one', async () => {
    apiSend.mockRejectedValueOnce(new Error('offline'));
    apiSend.mockResolvedValue({ ...ROW, link: 'https://x.test/m/1', invitation_text: 'نص https://x.test/m/1' });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ul><InviteeViewRow meetingId="m-1" invitee={ROW} /></ul>
      </QueryClientProvider>,
    );
    expect(screen.getByText(R.linkOnly)).toBeTruthy();
    const button = screen.getByRole('button', { name: `${R.resend} ${ROW.display_name}` });
    fireEvent.click(button);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(idOf(1)).toBe(idOf(0));
    await screen.findByText(R.linkOnlyHint);
    fireEvent.click(button);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(3));
    expect(idOf(2)).not.toBe(idOf(1));
  });
});
