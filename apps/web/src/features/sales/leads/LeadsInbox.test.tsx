import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { LeadsInbox } from './LeadsInbox';
import type { LeadRow, LeadSearch } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, ...rest }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`} {...rest}>{children}</a>
  ),
}));

const ROW: LeadRow = {
  id: 'l1',
  phone_e164: '+966501234567',
  name: 'أم سهيلة',
  source: 'facebook_ad',
  status: 'interested_no_slot',
  last_inbound_at: '2026-10-01T10:00:00+00:00',
  last_outbound_at: null,
  created_at: '2026-09-28T10:00:00+00:00',
};

function renderInbox(search: LeadSearch = { page: 1 }, opts: { total?: number; items?: LeadRow[] } = {}) {
  const items = opts.items ?? [ROW];
  apiFetch.mockResolvedValue({ items, total: opts.total ?? items.length, page: search.page, pageSize: 25 });
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeadsInbox search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return { onSearch };
}

afterEach(() => apiFetch.mockReset());

describe('LeadsInbox (R-LEAD-01, R-LEAD-02)', () => {
  it('lists leads under the cartouche with avatar, LTR phone, source and status chip', async () => {
    renderInbox({ status: 'interested_no_slot', page: 1 });
    expect(await screen.findByText('أم سهيلة')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.leads.title })).toBeTruthy();
    const row = within(screen.getByRole('listitem'));
    expect(row.getByText('+966 50 123 4567').getAttribute('dir')).toBe('ltr'); // grouped, display only
    expect(row.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
    expect(row.getByText('س')).toBeTruthy(); // avatar skips the kunya «أم»
    const chip = row.getByText(t.enums.leadStatus.interested_no_slot).closest('[data-tone]');
    expect(chip?.getAttribute('data-tone')).toBe('neutral');
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=1&pageSize=25&status=interested_no_slot');
  });

  it('a new lead is the admin’s turn: saffron chip with a hollow nuqta', async () => {
    renderInbox({ page: 1 }, { items: [{ ...ROW, status: 'new' }] });
    await screen.findByText('أم سهيلة');
    const chip = within(screen.getByRole('listitem')).getByText(t.enums.leadStatus.new).closest('[data-tone]');
    expect(chip?.getAttribute('data-tone')).toBe('act');
    expect(chip?.querySelector('[data-glyph]')?.getAttribute('data-glyph')).toBe('hollow');
  });

  it('status fihris resets to page 1, keeps the other filters; "all" clears the status', async () => {
    const { onSearch } = renderInbox({ status: 'lost', source: 'referral', page: 3 });
    await screen.findByText('أم سهيلة');
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.click(screen.getByRole('tab', { name: t.enums.leadStatus.no_reply }));
    expect(onSearch).toHaveBeenLastCalledWith({ status: 'no_reply', source: 'referral', page: 1 });
    fireEvent.click(screen.getByRole('tab', { name: t.leads.filterAll }));
    expect(onSearch).toHaveBeenLastCalledWith({ source: 'referral', page: 1 });
  });

  it('search applies the trimmed term (Enter) and the source select in «تصفية» filters, both from page 1', async () => {
    const { onSearch } = renderInbox({ status: 'new', page: 2 });
    await screen.findByText('أم سهيلة');
    const box = screen.getByRole('searchbox', { name: t.common.search });
    fireEvent.change(box, { target: { value: '  سهيلة ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSearch).toHaveBeenLastCalledWith({ status: 'new', q: 'سهيلة', page: 1 });
    expect(screen.queryByRole('combobox', { name: t.leads.source })).toBeNull(); // in the panel, not the row
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: t.leads.source }), {
      target: { value: 'referral' },
    });
    expect(onSearch).toHaveBeenLastCalledWith({ status: 'new', source: 'referral', page: 1 });
  });

  it('sends source and search to the API', async () => {
    renderInbox({ source: 'instagram_ad', q: '0501', page: 1 });
    await screen.findByText('أم سهيلة');
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=1&pageSize=25&source=instagram_ad&q=0501');
  });

  it('pages through server-side results', async () => {
    const { onSearch } = renderInbox({ page: 1 }, { total: 60 });
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(t.common.nextPage) }));
    expect(onSearch).toHaveBeenCalledWith({ page: 2 });
  });

  it('the count names what it counts: «N محادثة», or «N جديد» under a status filter', async () => {
    renderInbox({ page: 1 }, { total: 10 });
    expect(await screen.findByText(t.leads.count.replace('{n}', '10'))).toBeTruthy();
    cleanup();
    renderInbox({ status: 'new', page: 1 }, { total: 3 });
    const filtered = t.leads.countStatus.replace('{n}', '3').replace('{status}', t.enums.leadStatus.new);
    expect(await screen.findByText(filtered)).toBeTruthy();
  });

  it('shows the Arabic empty state', async () => {
    renderInbox({ page: 1 }, { items: [] });
    expect(await screen.findByRole('heading', { name: t.leads.empty })).toBeTruthy();
  });

  it('«حجز حلقة تجريبية» opens the wizard with the lead, its phone and name (R-LEAD-06)', async () => {
    renderInbox({ page: 1 }, { items: [ROW, { ...ROW, id: 'l2', name: 'أم جود', status: 'converted' }] });
    const book = await screen.findByRole('link', { name: t.booking.trialFor.replace('{name}', 'أم سهيلة') });
    expect(book.getAttribute('href')).toBe('/admin/book?leadId=l1&phone=%2B966501234567&name=%D8%A3%D9%85+%D8%B3%D9%87%D9%8A%D9%84%D8%A9');
    expect(screen.queryByRole('link', { name: t.booking.trialFor.replace('{name}', 'أم جود') })).toBeNull();
  });
});
