import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LeadsInbox } from './LeadsInbox';
import type { LeadSearch } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend: vi.fn() }));
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

function renderInbox(search: LeadSearch) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/sales/people') ? [SARA] : { items: [ROW], total: 1, page: 1, pageSize: 25 }),
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

describe('LeadsInbox order + assignee filter (R-NFR-08, R-LEAD-05)', () => {
  it('sends sort, dir and assignee to GET /leads', async () => {
    renderInbox({ page: 2, sort: 'created_at', dir: 'desc', assignee: 'none' });
    await screen.findByText('أم سهيلة');
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=2&pageSize=25&assignee=none&sort=created_at&dir=desc');
  });

  it('«الترتيب» picks an order on page 1, and back to the default clears it', async () => {
    const onSearch = renderInbox({ page: 3, status: 'new', sort: 'name' });
    await screen.findByText('أم سهيلة');
    const order = screen.getByRole('combobox', { name: t.leads.sortBy });
    expect((order as HTMLSelectElement).value).toBe('name');
    fireEvent.change(order, { target: { value: 'created_at:desc' } });
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, status: 'new', sort: 'created_at', dir: 'desc' });
    fireEvent.change(order, { target: { value: '' } });
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, status: 'new' });
  });

  it('the assignee filter lists «بدون مسؤول» and the salespeople', async () => {
    const onSearch = renderInbox({ page: 1 });
    await screen.findAllByRole('option', { name: SARA.name });
    const select = screen.getByRole('combobox', { name: t.sales.assign.label });
    fireEvent.change(select, { target: { value: SARA.id } });
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, assignee: SARA.id });
    fireEvent.change(select, { target: { value: 'none' } });
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1, assignee: 'none' });
  });
});
