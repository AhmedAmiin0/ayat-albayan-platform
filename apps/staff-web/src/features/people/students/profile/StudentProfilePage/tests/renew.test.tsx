import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { balanceOf, WEEKLY } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { StudentProfilePage } from '@/features/people/students/profile/StudentProfilePage/StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
vi.mock('@/features/finance/subscriptions/balance/BalanceCard/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('@/features/people/students/profile/StudentProfileForm/StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('@/features/people/students/duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

const student = (status: string) => ({
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status,
  guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: '+966500000001' },
  meeting_link: null,
  siblings: [],
});

/** The file's lists answer lists; '/students/s1' alone would also catch its sub-paths. */
const LISTS = [['/students/s1/assistants', []], ['/assistants', []]] as const;

function renderPage(status: string) {
  routeFetch(apiFetch, [
    ['/students/s1/balance', balanceOf([WEEKLY])],
    ...LISTS,
    ['/students/s1', student(status)],
  ]);
  renderWithClient(<StudentProfilePage studentId="s1" />);
}

describe('StudentProfilePage «جدّد الاشتراك» (owner 2026-10-15)', () => {
  it('a package-ended student: «جدّد الاشتراك» in the head, booking still linked', async () => {
    renderPage('pending_renewal');
    expect(await screen.findByRole('button', { name: t.students.renew })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.booking.open }).getAttribute('href')).toBe('/admin/book?studentId=s1');
  });

  it('owner 2026-11-17: a subscribed student renews ANY time (the start day picked in the dialog)', async () => {
    renderPage('active');
    expect(await screen.findByRole('button', { name: t.students.renew })).toBeTruthy();
  });

  it('a student without any package: no renewal', async () => {
    routeFetch(apiFetch, [
      ['/students/s1/balance', balanceOf([])],
      ...LISTS,
      ['/students/s1', student('new')],
    ]);
    renderWithClient(<StudentProfilePage studentId="s1" />);
    await screen.findByRole('link', { name: t.booking.open });
    expect(screen.queryByRole('button', { name: t.students.renew })).toBeNull();
  });
});
