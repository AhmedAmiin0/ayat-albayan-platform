import { formatPhone } from '@ab/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { StudentProfilePage } from './StudentProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
vi.mock('@/features/people/auth', async (orig) => ({ ...(await orig<object>()), usePermissions: () => ({ permissions: [], can: () => false }) }));
vi.mock('@/features/finance/subscriptions/balance/BalanceCard', () => ({ BalanceCard: () => null }));
vi.mock('./StudentProfileForm', () => ({ StudentProfileForm: () => null }));
vi.mock('../duplicates/SiblingMerge', () => ({ SiblingMerge: () => null }));

// The family's second number (owner 2026-10-29) in the file's meta line, beside the main one.
const MAIN = '+966500000001';
const SECOND = '+966552220000';
const guardian = (phones?: { phone_e164: string; is_primary: boolean }[]) => ({ id: 'g1', name: 'أم سهيلة', phone_e164: MAIN, ...(phones ? { phones } : {}) });
const STUDENT = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', meeting_link: null, siblings: [] };

// The file's meta line: the <dl> that holds «الكود».
const meta = () => screen.getByText(t.students.code, { selector: 'dt' }).closest('dl');
const terms = () => [...(meta()?.querySelectorAll('dt') ?? [])].map((d) => d.textContent);

function renderPage(g: ReturnType<typeof guardian>) {
  routeFetch(apiFetch, [
    ['/students/s1/course-pause', { open: null, history: [] }],
    ['/students/s1/', []],
    ['/students/s1', { ...STUDENT, guardian: g }],
  ]);
  renderWithClient(<StudentProfilePage studentId="s1" />);
}

describe('StudentProfilePage: «الرقم الثاني»', () => {
  beforeEach(() => apiFetch.mockReset());

  it('shows the second number after the guardian’s phone', async () => {
    renderPage(guardian([{ phone_e164: MAIN, is_primary: true }, { phone_e164: SECOND, is_primary: false }]));
    expect(await screen.findByRole('link', { name: t.reports.history })).toBeTruthy();
    expect(terms()).toEqual([t.students.code, t.students.guardian, t.students.guardianPhone, t.guardians.secondPhone, t.students.effectiveLink]);
    expect(meta()?.querySelectorAll('dd')[3]?.textContent).toBe(formatPhone(SECOND));
  });

  it.each([
    ['only the main number', guardian([{ phone_e164: MAIN, is_primary: true }])],
    ['an older API without phones', guardian()],
  ])('no row with %s', async (_, g) => {
    renderPage(g);
    expect(await screen.findByRole('link', { name: t.reports.history })).toBeTruthy();
    expect(terms()).toEqual([t.students.code, t.students.guardian, t.students.guardianPhone, t.students.effectiveLink]);
  });
});
