import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ABRAR, next, NOOR, STUDENT_ID } from '../../wizard-fixture';
import { TrialDateDialog } from './TrialDateDialog';
import { history, routeTrialFetch, routeTrialSend, row } from '../trial-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const STUDENT = { id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' };
const historyCalls = () => apiFetch.mock.calls.filter(([p]) => String(p).startsWith('/booking/trial-dates')).length;
const open = () => renderWithClient(<TrialDateDialog student={STUDENT} mode="admin" onClose={vi.fn()} />);

describe('TrialDateDialog states (PR #164 review)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a failed history read says so, with «حاول مرة أخرى» that reads it again', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, { code: 'internal' }));
    open();
    expect(await screen.findByText(t.trialDate.loadError)).toBeTruthy(); // the history itself stays collapsed
    const before = historyCalls();
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.retry }));
    await waitFor(() => expect(historyCalls()).toBeGreaterThan(before));
  });

  it('no «اخترنا معلم/ة آخر حلقة» note when that teacher is not in the list (not preselected)', async () => {
    const last = row({ teacher: { id: NOOR.id, name: NOOR.display_name_ar } });
    routeTrialFetch(apiFetch, { base: '/booking', history: history({ items: [last] }) });
    open();
    await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    expect(screen.queryByText(t.trialDate.lastTeacher)).toBeNull();
  });

  it('a failed pick (trial_changed) reads the history again', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history() });
    routeTrialSend(apiSend, { base: '/booking', answers: [new ApiError(409, { code: 'trial_changed' })] });
    open();
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    next();
    const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} `) });
    fireEvent.click(within(sunday).getByRole('button', { name: /17:00/ }));
    next();
    const before = historyCalls();
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.submit }));
    await screen.findByText(t.booking.error.trial_changed);
    await waitFor(() => expect(historyCalls()).toBeGreaterThan(before));
  });
});
