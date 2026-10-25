import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import type { StudentProfile } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { STUDENT_ID } from '../wizard-fixture';
import { TrialDatesSection } from './TrialDatesSection';
import { history, routeTrialFetch } from './trial-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const held = vi.hoisted(() => ({ list: ['booking.write'] }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: held.list, can: (p: string) => held.list.includes(p) }) }));

const profile = (status: StudentStatus) =>
  ({ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183', status, program: 'quran', tz: 'Asia/Riyadh' }) as StudentProfile;
const action = () => screen.getByTestId('trial-date-action');

describe('TrialDatesSection: the student file (R-STU-05)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    held.list = ['booking.write'];
  });

  it('a role without booking.write sees no section (its routes are 403 for it)', () => {
    held.list = ['students.read'];
    renderWithClient(<TrialDatesSection student={profile('trial')} />);
    expect(screen.queryByTestId('trial-dates-section')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each<StudentStatus>(['new', 'trial', 'pending_subscription'])('offers «موعد تجريبي جديد» to a %s student', async (status) => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history({ status }) });
    renderWithClient(<TrialDatesSection student={profile(status)} />);
    await screen.findByTestId('trial-date-history');
    expect(action()).toHaveProperty('disabled', false);
    expect(screen.queryByText(t.trialDate.notAllowed)).toBeNull();
  });

  it('a subscriber gets it disabled, with the reason', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history({ status: 'active', allowed: false, upcoming_id: null }) });
    renderWithClient(<TrialDatesSection student={profile('active')} />);
    await screen.findByTestId('trial-date-history');
    expect(action()).toHaveProperty('disabled', true);
    expect(action().getAttribute('aria-describedby')).toBe(screen.getByText(t.trialDate.notAllowed).id);
  });

  it('heads the history with its count', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history() });
    renderWithClient(<TrialDatesSection student={profile('trial')} />);
    expect((await screen.findByTestId('trial-date-count')).textContent).toBe('موعد واحد');
    expect(screen.getByTestId('trial-dates-section').querySelector('h2')?.textContent).toContain(t.trialDate.historyTitle);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/trial-dates?studentId=${STUDENT_ID}`);
  });

  it('says so when no date was picked yet', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history({ items: [], upcoming_id: null }) });
    renderWithClient(<TrialDatesSection student={profile('new')} />);
    expect(await screen.findByText(t.trialDate.empty)).toBeTruthy();
  });

  it('a failed load says so', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    renderWithClient(<TrialDatesSection student={profile('trial')} />);
    expect(await screen.findByText(t.trialDate.loadError)).toBeTruthy();
    expect(action()).toHaveProperty('disabled', false); // falls back to the status
  });

  it('opens the dialog named for the student', async () => {
    routeTrialFetch(apiFetch, { base: '/booking', history: history() });
    renderWithClient(<TrialDatesSection student={profile('trial')} />);
    await screen.findByTestId('trial-date-history');
    fireEvent.click(action());
    expect(screen.getByRole('dialog', { name: t.trialDate.title.replace('{name}', 'سهيلة') })).toBeTruthy();
  });
});
