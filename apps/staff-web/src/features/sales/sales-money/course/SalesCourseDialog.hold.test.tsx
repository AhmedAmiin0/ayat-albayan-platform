import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickWednesday } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, routeCourse } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const sent = () => apiSend.mock.calls.map(([method, path]) => `${String(method)} ${String(path)}`);

// Hold mode (owner 2026-11-06): unpaid with an open payment link, «احجز» keeps a draft.
describe('«أيام الحلقات» before the payment', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    apiSend.mockImplementation((_m: string, path: string) =>
      Promise.resolve(path === '/sales/booking/check' ? { conflicts: [] } : { state: 'draft', saved_at: 'x' }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('says the picks wait for the payment, saves them as a draft (PUT), books nothing', async () => {
    routeCourse(apiFetch, { ...COURSE_VIEW, hold: true });
    renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
    expect(await screen.findByText(t.courseDraft.held)).toBeTruthy();
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    await pickSlot();
    pickWednesday();
    await screen.findByText(t.booking.seriesFree);
    next();
    const submit = screen.getByRole('button', { name: t.booking.submit });
    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit);
    expect(await screen.findByText(t.courseDraft.saved)).toBeTruthy();
    expect(sent()).toContain('PUT /sales/booking/course/draft');
    expect(sent()).not.toContain('POST /sales/booking');
  });
});
