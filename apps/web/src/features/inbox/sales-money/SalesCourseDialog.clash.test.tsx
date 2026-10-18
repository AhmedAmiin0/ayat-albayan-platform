import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickWednesday, SLOT } from '@/features/booking/wizard-fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, routeCourse, routeCourseSend } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const nextButton = () => screen.getByRole('button', { name: t.booking.next });
const submit = () => screen.getByRole('button', { name: t.booking.submit });
const CLASH = { kind: 'teacher_busy', startsAt: SLOT, endsAt: SLOT };

/** Open the dialog, wait for the preselected teacher, then pick Sunday 17:00 and Wednesday 19:30. */
async function pickBothDays(): Promise<void> {
  renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
  const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
  await waitFor(() => expect(abrar).toHaveProperty('checked', true));
  await pickSlot();
  pickWednesday();
}

/** She never books over a clash: no reason field, no «احجز رغم التعارض». */
function expectNoOverride(): void {
  expect(screen.queryByRole('button', { name: t.booking.override })).toBeNull();
  expect(screen.queryByLabelText(new RegExp(t.booking.overrideReason))).toBeNull();
}

describe('the assistant’s course never books over a clash (owner 2026-10-18)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    routeCourse(apiFetch);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a clash in any week keeps her on the slot step: the clash listed, «التالي» disabled, no override', async () => {
    routeCourseSend(apiSend, { conflicts: [CLASH] });
    await pickBothDays();
    expect(await screen.findByText(t.booking.seriesCheck.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getByText(t.booking.courseNeedsCheck)).toBeTruthy();
    expect(nextButton().hasAttribute('disabled')).toBe(true);
    expectNoOverride();
  });

  it('a 409 conflict from «احجز» shows the clash with only «اختر موعدًا آخر», back to the slot step', async () => {
    apiSend.mockImplementation((_m: string, path: string) =>
      path === '/sales/booking/check'
        ? Promise.resolve({ conflicts: [] })
        : Promise.reject(new ApiError(409, { code: 'conflict', conflicts: [CLASH] })),
    );
    await pickBothDays();
    await screen.findByText(t.booking.seriesFree);
    next();
    await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit());
    const change = await screen.findByRole('button', { name: t.booking.changeSlot });
    expect(screen.getByText(t.booking.conflictTitle)).toBeTruthy();
    expectNoOverride();
    fireEvent.click(change);
    expect(await screen.findByRole('region', { name: t.booking.steps.slot })).toBeTruthy();
  });
});
