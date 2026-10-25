import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ABRAR, next, SLOT, STUDENT_ID } from '../wizard-fixture';
import { TrialDateDialog } from './TrialDateDialog';
import { history, routeTrialFetch, routeTrialSend, sentTo, UPCOMING_ID } from './trial-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const STUDENT = { id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' };
const DONE = { lesson_id: 'new-1', starts_at: SLOT, ends_at: SLOT, teacher_id: ABRAR.id, moved_from_id: UPCOMING_ID };
const CONFLICT = new ApiError(409, { code: 'conflict', conflicts: [{ kind: 'teacher_busy', startsAt: SLOT, endsAt: SLOT }] });

async function toReview(answers: unknown[], count = 1) {
  const items = Array.from({ length: count }, (_, i) => ({ ...history().items[0], lesson_id: i === 0 ? UPCOMING_ID : `old-${i}` }));
  routeTrialFetch(apiFetch, { base: '/booking', history: history({ items: items as ReturnType<typeof history>['items'] }) });
  routeTrialSend(apiSend, { base: '/booking', answers });
  const onClose = vi.fn();
  renderWithClient(<TrialDateDialog student={STUDENT} mode="admin" onClose={onClose} />);
  // The last trial's teacher is preselected (the hint), so «التالي» opens the slot grid.
  const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
  await waitFor(() => expect(abrar).toHaveProperty('checked', true));
  expect(screen.getByText(t.trialDate.lastTeacher)).toBeTruthy();
  next();
  const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} `) });
  fireEvent.click(within(sunday).getByRole('button', { name: /17:00/ }));
  next();
  return onClose;
}

describe('TrialDateDialog, admin (owner 2026-10-25, R-SCH-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('leaves the moved trial out of the grid and checks the trial-date route', async () => {
    await toReview([]);
    const slots = apiFetch.mock.calls.map(([p]) => String(p)).find((p) => p.startsWith('/booking/slots'));
    expect(slots).toContain(`excludeLessonId=${UPCOMING_ID}`);
    expect(sentTo(apiSend, '/booking/trial-date/check').length).toBeGreaterThan(0);
  });

  it('posts the trial body to /booking/trial-date, then shows «نُقلت» done', async () => {
    const onClose = await toReview([DONE]);
    expect(screen.getByText(/الاثنين 5 أكتوبر 17:00/)).toBeTruthy(); // the «moves» note names the old time
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.submit }));
    expect(await screen.findByText(t.trialDate.doneMoved)).toBeTruthy();
    const [body] = sentTo(apiSend, '/booking/trial-date');
    expect(body).toMatchObject({ studentIds: [STUDENT_ID], kind: 'trial', package: 'trial', teacherId: ABRAR.id, byday: [0], startTimeLocal: '17:00', startsAt: SLOT });
    expect(typeof body?.['clientRequestId']).toBe('string');
    expect(screen.getByText(t.trialDate.doneNote)).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('trial-date-done')).getByRole('button', { name: t.trialDate.close }));
    expect(onClose).toHaveBeenCalled();
  });

  it('books over a clash with the reason, the same request id', async () => {
    await toReview([CONFLICT, DONE]);
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.submit }));
    fireEvent.change(await screen.findByLabelText(t.booking.overrideReason), { target: { value: 'ولي الأمر موافق' } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.override }));
    await screen.findByText(t.trialDate.doneMoved);
    const [first, second] = sentTo(apiSend, '/booking/trial-date');
    expect(second).toMatchObject({ override: { reason: 'ولي الأمر موافق' }, clientRequestId: first?.['clientRequestId'] });
  });

  it('warns from the 3rd date on, without blocking', async () => {
    await toReview([DONE], 2);
    expect(screen.getByTestId('trial-date-warn').textContent).toBe(t.trialDate.warn.replace('{n}', '3'));
    expect(screen.getByRole('button', { name: t.trialDate.submit })).toHaveProperty('disabled', false);
  });

  it('a subscriber gets the reason, no wizard', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history({ allowed: false, status: 'active' }) });
    renderWithClient(<TrialDateDialog student={STUDENT} mode="admin" onClose={vi.fn()} />);
    expect(await screen.findByText(t.trialDate.notAllowed)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.next })).toBeNull();
  });
});
