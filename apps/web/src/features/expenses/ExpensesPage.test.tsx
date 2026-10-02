import type { ExpenseView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { totalsByCurrency } from './api';
import { ExpensesPage } from './ExpensesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const ADS: ExpenseView = {
  id: 'e1', month: '2026-09', category: 'ads', amount: 8000, currency: 'EGP', note: 'فيسبوك', created_at: '2026-09-02T09:00:00Z',
};
const TOOLS: ExpenseView = { ...ADS, id: 'e2', category: 'tools', amount: 120.5, currency: 'USD', note: null };

function renderPage(rows: ExpenseView[]) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExpensesPage month="2026-09" onMonth={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ExpensesPage (R-RPT-02, E4)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists the month with one total per currency', async () => {
    renderPage([ADS, TOOLS, { ...ADS, id: 'e3', amount: 500, note: null }]);
    expect(await screen.findByText('فيسبوك')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/expenses?month=2026-09');
    expect(screen.getByText('8,500')).toBeTruthy();
    expect(screen.getAllByText('120.5')).toHaveLength(2); // the row and its currency total
  });

  it('adds an expense in EGP for the shown month', async () => {
    renderPage([]);
    expect(await screen.findByText(t.expenses.empty)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.expenses.add }));
    const dialog = await screen.findByRole('dialog', { name: t.expenses.add });
    fireEvent.change(within(dialog).getByLabelText(t.expenses.amount), { target: { value: '8000' } });
    apiSend.mockResolvedValue(ADS);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/expenses', {
        month: '2026-09', category: 'ads', amount: 8000, currency: 'EGP', note: null,
      }),
    );
  });

  it('edits with PATCH and deletes after the confirm', async () => {
    renderPage([ADS]);
    fireEvent.click(await screen.findByRole('button', { name: t.common.edit }));
    const dialog = await screen.findByRole('dialog');
    apiSend.mockResolvedValue(ADS);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/expenses/e1', expect.objectContaining({ amount: 8000 })));
    fireEvent.click(screen.getByRole('button', { name: t.common.delete }));
    const confirm = await screen.findByRole('dialog', { name: t.expenses.deleteConfirm });
    fireEvent.click(within(confirm).getByRole('button', { name: t.common.delete }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/expenses/e1'));
  });
});

describe('totalsByCurrency', () => {
  it('sums per currency without float drift, sorted', () => {
    expect(totalsByCurrency([{ amount: 0.1, currency: 'USD' }, { amount: 0.2, currency: 'USD' }, { amount: 5, currency: 'EGP' }])).toEqual([
      ['EGP', 5],
      ['USD', 0.3],
    ]);
  });
});
