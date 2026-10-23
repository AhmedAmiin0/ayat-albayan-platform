import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JOUD, lesson, SUHAILA } from '@/features/schedule/lesson-fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { FeedbackRequestButton } from './FeedbackRequestButton';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const tpl = (status: string) => [{ key: 'lesson_feedback_request', status }];

function open(l: ReturnType<typeof lesson>, status = 'approved') {
  apiFetch.mockResolvedValue(tpl(status));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackRequestButton lesson={l} />
    </QueryClientProvider>,
  );
}

describe('FeedbackRequestButton «أرسل طلب الرأي»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('is not offered before the lesson took place', () => {
    open(lesson({ status: 'scheduled' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is disabled, with the reason, while WhatsApp has not approved the template', async () => {
    open(lesson({ status: 'completed' }), 'pending');
    expect(await screen.findByText(t.feedback.templateNotApproved)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.feedback.sendRequest })).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: t.feedback.templateSettings }).getAttribute('href')).toBe('/admin/settings/communications?tab=templates');
  });

  it('posts the student to the lesson and then reads «اتبعت»', async () => {
    apiSend.mockResolvedValue(undefined);
    open(lesson({ id: 'l-7', status: 'completed', students: [SUHAILA] }));
    const button = await screen.findByRole('button', { name: t.feedback.sendRequest });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    expect(await screen.findByRole('button', { name: t.feedback.requestSent })).toHaveProperty('disabled', true);
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/feedback-request', { studentId: 's-1' });
  });

  it('a group lesson gets one button per student, named', async () => {
    open(lesson({ status: 'late', students: [SUHAILA, JOUD] }));
    expect(await screen.findByRole('button', { name: t.feedback.requestFor.replace('{name}', 'جود') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.feedback.requestFor.replace('{name}', 'سهيلة') })).toBeTruthy();
  });

  it('a student who was absent or excused is not offered, the sibling who came is', async () => {
    open(lesson({ status: 'completed', students: [{ ...SUHAILA, attendance: 'absent' }, { ...JOUD, attendance: 'on_time' }] }));
    expect(await screen.findByRole('button', { name: t.feedback.requestFor.replace('{name}', 'جود') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.feedback.requestFor.replace('{name}', 'سهيلة') })).toBeNull();
  });

  it('words a refusal because the template is not approved (409)', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'template_not_approved' }));
    open(lesson({ status: 'completed', students: [SUHAILA] }));
    const button = await screen.findByRole('button', { name: t.feedback.sendRequest });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    expect((await screen.findAllByText(t.feedback.templateNotApproved)).length).toBeGreaterThan(0);
  });
});
