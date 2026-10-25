import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { findFilters, openFilters } from '@/test/open-filters';
import { page, PAYMENT, SESSIONS } from './fixtures';
import { PaymentsHistory } from './PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const by = (col: string) => t.table.filterBy.replace('{col}', col);
const show = (node: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

describe('teacher earnings tables: server sort + filters (R-NFR-08)', () => {
  beforeEach(() => apiFetch.mockReset());

  it('sessions: a header click sorts on the API (asc, then desc), the status control still filters', async () => {
    apiFetch.mockResolvedValue(page(SESSIONS));
    show(<SessionsPanel scope={{ kind: 'mine' }} />);
    fireEvent.click(await screen.findByRole('button', { name: t.earnings.amount }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/teachers/me/earnings/sessions?sort=amount&page=1&pageSize=20'));
    fireEvent.click(screen.getByRole('button', { name: t.earnings.amount }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('sort=amount&dir=desc&page=1')));
    fireEvent.click(screen.getByRole('button', { name: t.earnings.filter.unpaid }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/sort=amount&dir=desc.*status=unpaid/)));
  });

  it('payments: sort by amount; filter standing ones and by method', async () => {
    apiFetch.mockResolvedValue(page([PAYMENT]));
    show(<PaymentsHistory scope={{ kind: 'admin', teacherId: 't1' }} />);
    fireEvent.click(await screen.findByRole('button', { name: t.earnings.amount }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/teacher-earnings/t1/payments?sort=amount&page=1&pageSize=20'));
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.finance.voidedColumn) }), { target: { value: 'false' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('sort=amount&voided=false&page=1')));
    fireEvent.change(screen.getByRole('combobox', { name: by(t.payments.method) }), { target: { value: 'cash' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('voided=false&method=cash')));
  });

  it('payments: a filter that matches nothing keeps the filter row', async () => {
    apiFetch.mockResolvedValueOnce(page([PAYMENT])).mockResolvedValue(page([]));
    show(<PaymentsHistory scope={{ kind: 'mine' }} />);
    await findFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by(t.payments.method) }), { target: { value: 'cash' } });
    expect(await screen.findByText(t.earnings.noPayments)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: by(t.payments.method) })).toBeTruthy();
  });
});
