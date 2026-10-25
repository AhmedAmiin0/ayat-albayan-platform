import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { balanceOf, WEEKLY } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n/i18n';
import { StudentProfilePage } from './StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
vi.mock('@/features/subscriptions/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('./StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('../duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

const student = (status: string) => ({
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status,
  guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: '+966500000001' },
  meeting_link: null,
  siblings: [],
});

function renderPage(status: string) {
  routeFetch(apiFetch, [
    ['/students/s1/balance', balanceOf([WEEKLY])],
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

  it('a subscribed or not-yet-subscribed student: no renewal', async () => {
    renderPage('active');
    await screen.findByRole('link', { name: t.booking.open });
    expect(screen.queryByRole('button', { name: t.students.renew })).toBeNull();
  });
});
