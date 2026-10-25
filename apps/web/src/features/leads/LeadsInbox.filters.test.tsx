import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearAllFilters, closeFilters, openFilters } from '@/test/open-filters';
import { LeadsInbox } from './LeadsInbox';
import type { LeadSearch } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const ROW = {
  id: 'l1',
  phone_e164: '+966501234567',
  name: 'أم سهيلة',
  source: 'facebook_ad',
  status: 'new',
  last_inbound_at: null,
  last_outbound_at: null,
  created_at: '2026-09-28T10:00:00+00:00',
};
const SARA = { id: '22222222-2222-4222-8222-222222222222', name: 'سارة' };
const chipName = (label: string, value: string) =>
  t.table.removeFilter.replace('{filter}', t.table.activeFilter.replace('{label}', label).replace('{value}', value));

function renderInbox(search: LeadSearch, total = 7) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/sales/people') ? [SARA] : { items: [ROW], total, page: 1, pageSize: 25 }),
  );
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeadsInbox search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

afterEach(() => apiFetch.mockReset());

describe('LeadsInbox on the shared filter toolbar', () => {
  it('one search box and «تصفية»: no select sits in the row any more', async () => {
    renderInbox({ page: 1 });
    await screen.findByText('أم سهيلة');
    expect(screen.getByRole('searchbox', { name: t.common.search }).getAttribute('placeholder')).toBe(t.leads.searchPlaceholder);
    expect(screen.queryByRole('combobox', { name: t.leads.source })).toBeNull();
    expect(screen.queryByRole('combobox', { name: t.leads.sortBy })).toBeNull();
    const panel = openFilters();
    for (const name of [t.leads.source, t.sales.assign.label, t.leads.sortBy]) {
      expect(panel.querySelector('select')).not.toBeNull();
      expect(screen.getByRole('combobox', { name })).toBeTruthy();
    }
  });

  it('set source, assignee and order are chips with the salesperson\'s name; each removes only itself', async () => {
    const onSearch = renderInbox({ page: 2, status: 'new', source: 'referral', assignee: SARA.id, sort: 'name' });
    await screen.findByRole('button', { name: chipName(t.sales.assign.label, SARA.name) });
    const button = screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) });
    expect(button.textContent).toContain('3');
    fireEvent.click(screen.getByRole('button', { name: chipName(t.leads.source, t.enums.leadSource.referral) }));
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, status: 'new', assignee: SARA.id, sort: 'name' });
    fireEvent.click(screen.getByRole('button', { name: chipName(t.leads.sortBy, t.leads.sort.name) }));
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, status: 'new', source: 'referral', assignee: SARA.id });
  });

  it('«مسح الكل» drops the three but keeps the status tab and the search text', async () => {
    const onSearch = renderInbox({ page: 2, status: 'new', q: 'سهيلة', source: 'referral', assignee: 'none', sort: 'name' });
    await screen.findByRole('button', { name: chipName(t.sales.assign.label, t.sales.assign.none) });
    clearAllFilters();
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, status: 'new', q: 'سهيلة' });
  });

  it('the panel\'s primary button names the leads the filters leave', async () => {
    renderInbox({ page: 1, source: 'referral' }, 12);
    await screen.findByText('أم سهيلة');
    openFilters();
    expect(await screen.findByRole('button', { name: t.table.showResultsCount.replace('{n}', '12') })).toBeTruthy();
    closeFilters();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
