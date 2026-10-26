import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { history } from '@/features/booking/trial-date/trial-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { StudentProfilePage } from './StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['booking.write'], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
vi.mock('@/features/subscriptions/balance/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('./StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('../duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

const STUDENT = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'trial',
  program: 'quran',
  tz: 'Asia/Riyadh',
  guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: '+966500000001' },
  meeting_link: null,
  siblings: [],
};

describe('StudentProfilePage: «مواعيد الحلقة التجريبية» (R-STU-05)', () => {
  it('shows the history and «موعد تجريبي جديد» in the student file', async () => {
    routeFetch(apiFetch, [
      ['/students/s1/', []], // the cards below the head (assistants, recordings…): empty
      ['/students/s1', STUDENT],
      ['/booking/trial-dates?studentId=s1', history({ student_id: 's1' })],
    ]);
    renderWithClient(<StudentProfilePage studentId="s1" />);
    expect(await screen.findByTestId('trial-date-history')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.trialDate.action })).toHaveProperty('disabled', false);
  });
});
