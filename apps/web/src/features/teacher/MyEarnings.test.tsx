import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { EARNINGS, PAYMENTS } from '@/features/teacher-earnings/fixtures';
import { t } from '@/lib/i18n';
import { MyEarnings } from './MyEarnings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const tt = t.teacherEarnings;
afterEach(() => apiFetch.mockReset());

describe('MyEarnings (teacher portal, read-only)', () => {
  it('shows balance, sessions and payments from /teachers/me, with no pay button, ticks or receipt link', async () => {
    routeFetch(apiFetch, [
      ['/teachers/me/earnings/payments', PAYMENTS],
      ['/teachers/me/earnings', EARNINGS],
    ]);
    renderWithClient(<MyEarnings />);
    expect(await screen.findByTestId('balance-cards')).toBeTruthy();
    const sessions = await screen.findByRole('region', { name: tt.sessionsTitle });
    expect(within(sessions).getAllByText(tt.status.earned)).toHaveLength(2);
    expect(await screen.findByText(tt.fromPayout)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(tt.pay) })).toBeNull();
    expect(screen.queryByRole('button', { name: tt.viewReceipt })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/earnings');
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/earnings/payments');
  });

  it('no sessions yet says so', async () => {
    routeFetch(apiFetch, [
      ['/teachers/me/earnings/payments', []],
      ['/teachers/me/earnings', { ...EARNINGS, sessions: [] }],
    ]);
    renderWithClient(<MyEarnings />);
    expect(await screen.findByText(tt.mineEmpty)).toBeTruthy();
    expect(screen.getByText(tt.paymentsEmpty)).toBeTruthy();
  });
});
