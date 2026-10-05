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
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: vi.fn() }) } } }));

const ADS: ExpenseView = {
  id: 'e1', month: '2026-09', category: 'ads', amount: 8000, currency: 'EGP', note: 'فيسبوك', created_at: '2026-09-02T09:00:00Z',
  paid_on: '2026-09-02', vendor: null, method: null, has_receipt: false, recurring: false, is_draft: false,
};
const TOOLS: ExpenseView = { ...ADS, id: 'e2', category: 'tools', amount: 120.5, currency: 'USD', note: null };
const CATEGORIES = [
  { key: 'ads', label_ar: 'إعلانات', label_en: 'Ads', active: true },
  { key: 'rent', label_ar: 'إيجار', label_en: 'Rent', active: true },
];

function renderPage(rows: ExpenseView[]) {
  apiFetch.mockImplementation(async (path: string) => (path === '/expense-categories' ? CATEGORIES : rows));
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

  it('lists the month with one total per currency; a draft is not counted and can be confirmed', async () => {
    renderPage([ADS, TOOLS, { ...ADS, id: 'e3', amount: 500, note: null }, { ...ADS, id: 'e4', amount: 999, is_draft: true, note: null }]);
    expect(await screen.findByText(/فيسبوك/)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/expenses?month=2026-09');
    expect(screen.getByText('8,500')).toBeTruthy();
    apiSend.mockResolvedValue(ADS);
    fireEvent.click(screen.getByRole('button', { name: t.finance.confirmDraft }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/expenses/e4', { isDraft: false }));
  });

  it('adds an expense: a missing amount is a field error; the category comes from the table', async () => {
    renderPage([]);
    expect(await screen.findByText(t.expenses.empty)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.expenses.add }));
    const dialog = await screen.findByRole('dialog', { name: t.expenses.add });
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    expect(await within(dialog).findByText(t.common.required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    await within(dialog).findByRole('option', { name: 'إيجار' });
    fireEvent.change(within(dialog).getByLabelText(t.expenses.category), { target: { value: 'rent' } });
    fireEvent.change(within(dialog).getByLabelText(t.expenses.amount), { target: { value: '8000' } });
    fireEvent.change(within(dialog).getByLabelText(t.finance.paidOn), { target: { value: '2026-09-15' } });
    apiSend.mockResolvedValue(ADS);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/expenses', expect.objectContaining({ month: '2026-09', category: 'rent', amount: 8000, paidOn: '2026-09-15', recurring: false })),
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

  it('the year table shows the months in the reporting currency and warns about a missing rate', async () => {
    renderPage([ADS]);
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/expense-categories') return CATEGORIES;
      if (path.startsWith('/expenses/year')) {
        const months = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, total: i === 8 ? 615 : 0, by_category: i === 8 ? { ads: 615 } : {} }));
        return { year: '2026', currency: 'SAR', months, categories: ['ads'], total: 615, fx_missing: ['AED'], fx_date: null };
      }
      return [ADS];
    });
    fireEvent.click(await screen.findByRole('button', { name: t.finance.yearView.replace('{year}', '2026') }));
    expect(await screen.findByText(t.finance.fxMissing.replace('{currencies}', 'AED'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/expenses/year?year=2026');
  });
});

describe('totalsByCurrency', () => {
  it('sums per currency without float drift, sorted; drafts left out', () => {
    const row = (amount: number, currency: string, is_draft = false) => ({ amount, currency, is_draft });
    expect(totalsByCurrency([row(0.1, 'USD'), row(0.2, 'USD'), row(5, 'EGP'), row(50, 'EGP', true)])).toEqual([
      ['EGP', 5],
      ['USD', 0.3],
    ]);
  });
});
