import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { TeacherMessagesPage } from './TeacherMessagesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const ROWS = [{ student_id: 's1', student_name: 'سلمى', student_code: 'AB-0201', unread: 2, last_message: { body: 'متى الحلقة؟', sender_role: 'guardian', created_at: '2026-10-27T10:00:00.000Z' } }];
const show = (studentId: string | null, onPick = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TeacherMessagesPage studentId={studentId} onPick={onPick} />
    </QueryClientProvider>,
  );
  return onPick;
};

describe('TeacherMessagesPage «رسائل الطلاب»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists my current students with their unread count; a pick opens the thread', async () => {
    apiFetch.mockResolvedValue(ROWS);
    const onPick = show(null);
    expect(await screen.findByText(c.unread.replace('{n}', '2'))).toBeTruthy();
    expect(screen.getByText(c.pick)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /سلمى/ }));
    expect(onPick).toHaveBeenCalledWith('s1');
  });

  it('a picked student shows the thread with the composer; «كل الطلاب» goes back', async () => {
    apiSend.mockResolvedValue({});
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('/messages') ? channelPage() : ROWS));
    const onPick = show('s1');
    expect(await screen.findByLabelText(c.messageLabel)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'سلمى' })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/messages');
    fireEvent.click(screen.getByRole('button', { name: c.back }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('a student no longer mine (a teacher change) is not opened; no student: the empty state', async () => {
    apiFetch.mockResolvedValue([]);
    show('s9');
    expect(await screen.findByText(c.listEmpty)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalledWith('/teachers/me/channels/s9/messages');
  });
});
