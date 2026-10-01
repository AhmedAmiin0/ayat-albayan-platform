import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LeadsInbox } from './LeadsInbox';
import type { LeadRow, LeadSearch } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend }));

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

function renderInbox(search: LeadSearch = { page: 1 }, total = 1) {
  apiFetch.mockResolvedValue({ items: [ROW], total, page: search.page, pageSize: 25 });
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeadsInbox search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return { onSearch };
}

afterEach(() => {
  vi.restoreAllMocks();
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('LeadsInbox (R-LEAD-01, R-LEAD-04)', () => {
  it('lists leads with Arabic status chip and source labels', async () => {
    renderInbox({ status: 'interested_no_slot', page: 1 });
    expect(await screen.findByText('أم سهيلة')).toBeTruthy();
    expect(screen.getByText('+966501234567')).toBeTruthy();
    expect(screen.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
    const chip = document.querySelector('[data-status="interested_no_slot"]');
    expect(chip?.textContent).toBe(t.enums.leadStatus.interested_no_slot);
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=1&pageSize=25&status=interested_no_slot');
  });

  it('status tabs reset to page 1; the "all" tab clears the filter', async () => {
    const { onSearch } = renderInbox({ status: 'lost', page: 3 });
    await screen.findByText('أم سهيلة');
    fireEvent.click(screen.getByRole('tab', { name: t.enums.leadStatus.no_reply }));
    expect(onSearch).toHaveBeenLastCalledWith({ status: 'no_reply', page: 1 });
    fireEvent.click(screen.getByRole('tab', { name: t.leads.filterAll }));
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1 });
  });

  it('reclassify asks for confirmation, then POSTs and confirms in Arabic', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiSend.mockResolvedValue({ id: 'a1' });
    renderInbox();
    fireEvent.click(await screen.findByRole('button', { name: t.leads.reclassifyAsApplicant }));
    expect(window.confirm).toHaveBeenCalledWith(t.leads.reclassifyConfirm);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(t.leads.reclassified));
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/reclassify');
  });

  it('does nothing when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderInbox();
    fireEvent.click(await screen.findByRole('button', { name: t.leads.reclassifyAsApplicant }));
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('pages through server-side results', async () => {
    const { onSearch } = renderInbox({ page: 1 }, 60);
    fireEvent.click(await screen.findByRole('button', { name: t.leads.nextPage }));
    expect(onSearch).toHaveBeenCalledWith({ page: 2 });
  });
});
