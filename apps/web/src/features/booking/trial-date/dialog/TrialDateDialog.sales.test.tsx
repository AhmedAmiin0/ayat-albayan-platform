import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ABRAR, next, SLOT, STUDENT_ID } from '../../wizard-fixture';
import { TrialDateDialog } from './TrialDateDialog';
import { history, routeTrialFetch, routeTrialSend, row, sentTo } from '../trial-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const STUDENT = { id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' };
const BASE = '/sales/booking';
const DONE = { lesson_id: 'new-1', starts_at: SLOT, ends_at: SLOT, teacher_id: ABRAR.id, moved_from_id: null };
const CONFLICT = new ApiError(409, { code: 'conflict', conflicts: [{ kind: 'teacher_busy', startsAt: SLOT, endsAt: SLOT }] });

async function toReview(answers: unknown[]) {
  // No upcoming trial (the last one was missed): a new trial lesson.
  routeTrialFetch(apiFetch, { base: BASE, history: history({ upcoming_id: null, items: [row({ outcome: 'absent' })] }) });
  routeTrialSend(apiSend, { base: BASE, answers });
  renderWithClient(<TrialDateDialog student={STUDENT} mode="sales" onClose={vi.fn()} />);
  const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
  await waitFor(() => expect(abrar).toHaveProperty('checked', true));
  next();
  const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} `) });
  fireEvent.click(within(sunday).getByRole('button', { name: /17:00/ }));
  next();
}

describe('TrialDateDialog, sales (R-ASST-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('reads her routes and books a new trial through /sales/booking/trial-date', async () => {
    await toReview([DONE]);
    expect(apiFetch).toHaveBeenCalledWith(`${BASE}/trial-dates?studentId=${STUDENT_ID}`);
    expect(screen.getByText(t.trialDate.newLesson)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.submit }));
    expect(await screen.findByText(t.trialDate.done)).toBeTruthy();
    expect(sentTo(apiSend, `${BASE}/trial-date`)[0]).toMatchObject({ studentIds: [STUDENT_ID], kind: 'trial', teacherId: ABRAR.id });
    expect(sentTo(apiSend, '/booking/trial-date')).toHaveLength(0);
  });

  it('never books over a clash: only «اختر موعدًا آخر»', async () => {
    await toReview([CONFLICT]);
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.submit }));
    expect(await screen.findByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
    expect(screen.queryByLabelText(t.booking.overrideReason)).toBeNull();
  });

  it('shows the history behind «عرض المواعيد» with its count', async () => {
    await toReview([]);
    expect(screen.getByText('موعد واحد')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.showHistory }));
    expect(within(screen.getByTestId('trial-date-history')).getByText(t.trialDate.outcome.absent)).toBeTruthy();
  });
});
