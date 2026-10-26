import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { BALANCE, page, PAYMENT, SESSIONS } from './fixtures';
import { MyEarnings } from './MyEarnings';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyEarnings />
    </QueryClientProvider>,
  );

describe('MyEarnings «مستحقاتي» (teacher, read only)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('asks only the /teachers/me routes (never an id) and shows earned, paid, outstanding and every lesson', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.includes('/sessions') ? page(SESSIONS) : path.includes('/payments') ? page([PAYMENT]) : BALANCE),
    );
    renderPage();
    expect(await screen.findByText(t.earnings.outstanding)).toBeTruthy();
    expect(await screen.findByText(t.earnings.statusName.partially_paid)).toBeTruthy();
    expect(await screen.findByText('دفعة أكتوبر')).toBeTruthy();
    const paths = apiFetch.mock.calls.map((c) => c[0] as string);
    expect(paths.length).toBeGreaterThanOrEqual(3);
    expect(paths.every((p) => p.startsWith('/teachers/me/earnings'))).toBe(true);
  });

  it('has no ticks and no pay button: a teacher cannot pay or choose lessons', async () => {
    apiFetch.mockImplementation((path: string) => Promise.resolve(path.includes('/sessions') || path.includes('/payments') ? page([]) : BALANCE));
    renderPage();
    await screen.findByText(t.earnings.empty);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: t.earnings.pay })).toBeNull();
  });

  it('links to the monthly statements and filters the lessons', async () => {
    apiFetch.mockImplementation((path: string) => Promise.resolve(path.includes('/sessions') || path.includes('/payments') ? page(SESSIONS) : BALANCE));
    renderPage();
    expect((await screen.findByRole('link', { name: t.earnings.monthly })).getAttribute('href')).toBe('/teacher/payouts');
    fireEvent.click(await screen.findByRole('button', { name: t.earnings.filter.unpaid }));
    await vi.waitFor(() => expect(apiFetch.mock.calls.some((c) => String(c[0]).includes('/sessions?') && String(c[0]).includes('status=unpaid'))).toBe(true));
  });

  it('an account not linked to a teacher says so', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, { code: 'teacher_not_linked' }));
    renderPage();
    expect(await screen.findByText(t.earnings.error.teacher_not_linked)).toBeTruthy();
  });
});
