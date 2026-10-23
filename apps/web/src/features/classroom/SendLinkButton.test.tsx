import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JOUD, lesson, SUHAILA } from '@/features/schedule/lesson-fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { SendLinkButton } from './SendLinkButton';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

function open(l: ReturnType<typeof lesson>, status = 'approved') {
  apiFetch.mockResolvedValue([{ key: 'lesson_join_link', status }]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SendLinkButton lesson={l} />
    </QueryClientProvider>,
  );
}

describe('SendLinkButton «أرسل رابط الحلقة»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('is not offered on a cancelled lesson', () => {
    open(lesson({ status: 'cancelled_by_admin' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is disabled with the reason while WhatsApp has not approved the template', async () => {
    open(lesson({ status: 'confirmed', students: [SUHAILA] }), 'pending');
    expect(await screen.findByText(new RegExp(t.classroom.error.template_not_approved))).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.sendLink })).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: t.feedback.templateSettings }).getAttribute('href')).toBe('/admin/settings/communications?tab=templates');
  });

  it('posts the student, then reads «أُرسل الرابط»', async () => {
    apiSend.mockResolvedValue({ expires_at: 'x', replayed: false, message_status: 'queued' });
    open(lesson({ id: 'l-7', status: 'confirmed', students: [SUHAILA] }));
    const button = await screen.findByRole('button', { name: t.classroom.sendLink });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    expect((await screen.findAllByText(t.classroom.linkSent)).length).toBeGreaterThan(0);
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/join-link', { studentId: 's-1' });
  });

  it('a replay reads «اتبعت قبل كده»', async () => {
    apiSend.mockResolvedValue({ expires_at: 'x', replayed: true, message_status: 'sent' });
    open(lesson({ status: 'confirmed', students: [SUHAILA] }));
    const button = await screen.findByRole('button', { name: t.classroom.sendLink });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    expect((await screen.findAllByText(t.classroom.linkResent)).length).toBeGreaterThan(0);
  });

  it('a group lesson gets one named button per student', async () => {
    open(lesson({ status: 'confirmed', students: [SUHAILA, JOUD] }));
    const name = (n: string) => `${t.classroom.sendLink} ${t.classroom.sendLinkTo.replace('{name}', n)}`;
    expect(await screen.findByRole('button', { name: name('جود') })).toBeTruthy();
    expect(screen.getByRole('button', { name: name('سهيلة') })).toBeTruthy();
  });

  it('words a 409 template_not_approved', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'template_not_approved' }));
    open(lesson({ status: 'confirmed', students: [SUHAILA] }));
    const button = await screen.findByRole('button', { name: t.classroom.sendLink });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toContain(t.classroom.error.template_not_approved);
  });
});
