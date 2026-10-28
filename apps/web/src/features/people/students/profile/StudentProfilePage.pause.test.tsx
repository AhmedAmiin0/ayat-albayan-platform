import { riyadhToday } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { StudentProfilePage } from './StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['courses.pause'] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));
vi.mock('@/features/finance/subscriptions/balance/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('./StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('../duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

// «إيقاف مؤقت» on the admin's student file (owner 2026-10-28): the head action and the banner.
const STUDENT = {
  id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', meeting_link: null, siblings: [],
  guardian: { id: 'g1', name: 'أم سهيلة', phone_e164: '+966500000001' },
};
const today = riyadhToday();
const OPEN = { id: 'p1', from_date: today, until_date: null, reason: null, created_at: '', created_by_name: null, resumed_at: null, extended_days: null };

function renderPage(open: typeof OPEN | null) {
  routeFetch(apiFetch, [
    ['/students/s1/course-pause/preview', { from_date: today, until_date: null, lessons: 1 }],
    ['/students/s1/course-pause', { open, history: [] }],
    // The file's other cards (assistants, invoices, recordings…) read lists under the student.
    ['/students/s1/', []],
    ['/students/s1', { ...STUDENT, status: open ? 'paused' : 'active' }],
  ]);
  renderWithClient(<StudentProfilePage studentId="s1" />);
}

describe('StudentProfilePage: course pause', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    perms.list = ['courses.pause'];
  });

  it('with courses.pause and no open pause: «إيقاف مؤقت» opens the sheet', async () => {
    renderPage(null);
    fireEvent.click(await screen.findByRole('button', { name: t.coursePause.action }));
    expect(await screen.findByRole('dialog', { name: t.coursePause.title })).toBeTruthy();
    expect(await screen.findByText(t.coursePause.preview.one)).toBeTruthy();
  });

  it('without the permission there is no action', async () => {
    perms.list = [];
    renderPage(null);
    expect(await screen.findByRole('link', { name: t.reports.history })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.coursePause.action })).toBeNull();
  });

  it('paused: the banner with «استئناف» at the top, and no second «إيقاف مؤقت»', async () => {
    renderPage(OPEN);
    expect(await screen.findByText(t.coursePause.bannerOpen)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.coursePause.resume })).toBeTruthy();
    expect(screen.getByText(t.enums.studentStatus.paused)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.coursePause.action })).toBeNull();
  });
});
