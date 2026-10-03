import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LeadsInbox } from './LeadsInbox';
import type { LeadRow } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, ...rest }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`} {...rest}>{children}</a>
  ),
}));

const ROW: LeadRow = {
  id: 'l1', phone_e164: '+966501234567', name: 'أم سهيلة', source: 'facebook_ad', status: 'new',
  last_inbound_at: null, last_outbound_at: null, created_at: '2026-09-28T10:00:00+00:00',
  assigned_to: null, assigned_to_name: null,
};
const PEOPLE = [{ profile_id: 'p1', full_name: 'منى', open_leads: 2 }, { profile_id: 'p2', full_name: 'خالد', open_leads: 0 }];

function open(row: LeadRow = ROW) {
  apiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/sales/people') ? PEOPLE : { items: [row], total: 1, page: 1, pageSize: 25 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeadsInbox search={{ page: 1 }} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('leads: «مسؤول المبيعات» (admin)', () => {
  it('each lead has a select: «من غير مسؤول» plus the salespeople; picking one POSTs the assignment', async () => {
    open();
    const select = (await screen.findByRole('combobox', { name: /مسؤول المبيعات لـ أم سهيلة/ })) as HTMLSelectElement;
    await waitFor(() => expect(select.options).toHaveLength(3));
    expect([...select.options].map((o) => o.textContent)).toEqual([t.sales.assign.none, 'منى', 'خالد']);
    expect(select.value).toBe('');
    apiSend.mockResolvedValue({});
    fireEvent.change(select, { target: { value: 'p2' } });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/assign', { profileId: 'p2' }));
  });

  it('choosing «من غير مسؤول» sends profileId null', async () => {
    open({ ...ROW, assigned_to: 'p1', assigned_to_name: 'منى' });
    const select = (await screen.findByRole('combobox', { name: /مسؤول المبيعات لـ/ })) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('p1'));
    apiSend.mockResolvedValue({});
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/assign', { profileId: null }));
  });

  it('«عيّن العملاء من غير مسؤول» assigns them all and says how many', async () => {
    open();
    apiSend.mockResolvedValue({ assigned: 7 });
    fireEvent.click(await screen.findByRole('button', { name: t.sales.assign.assignAll }));
    expect(await screen.findByText('اتعيّن 7 عميل')).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/assign-unassigned');
  });
});
