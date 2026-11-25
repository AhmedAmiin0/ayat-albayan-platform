import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@ab/web-kit';
import { StudentProfilePage } from '@/features/people/students/profile/StudentProfilePage/StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
// The page's own head is under test; the cards below it have their own tests.
vi.mock('@/features/finance/subscriptions/balance/BalanceCard/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('@/features/people/students/profile/StudentProfileForm/StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('@/features/people/students/duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

const STUDENT = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: '+966500000001' },
  meeting_link: null,
  siblings: [],
};

describe('StudentProfilePage head (R-STU-05, R-REP-05)', () => {
  it('links to the student’s «سجل التقارير» and to booking', async () => {
    routeFetch(apiFetch, [['/students/s1', STUDENT]]);
    renderWithClient(<StudentProfilePage studentId="s1" />);
    const history = await screen.findByRole('link', { name: t.reports.history });
    expect(history.getAttribute('href')).toBe('/admin/students/s1/reports');
    expect(screen.getByRole('link', { name: t.booking.open }).getAttribute('href')).toBe('/admin/book?studentId=s1');
  });
});
