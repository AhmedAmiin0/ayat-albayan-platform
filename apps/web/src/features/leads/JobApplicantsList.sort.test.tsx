import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import type { ListUrlState } from '@/lib/list/list-url';
import { JobApplicantsList } from './JobApplicantsList';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend: vi.fn() }));

const ROW = {
  id: 'a1',
  phone_e164: '+201001234567',
  name: 'أ. منى',
  status: 'new',
  cv_url: null,
  recitation_url: null,
  notes: null,
  created_at: '2026-09-28T10:00:00+00:00',
};

function renderList(search: ListUrlState, total = 1) {
  apiFetch.mockResolvedValue({ items: total ? [ROW] : [], total, page: search.page, pageSize: 25 });
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JobApplicantsList search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

const label = (col: string) => t.table.filterBy.replace('{col}', col);
const EMPTY: ListUrlState = { page: 2, sort: {}, filters: {} };

afterEach(() => apiFetch.mockReset());

describe('JobApplicantsList sort + column filters (R-LEAD-04, R-NFR-08)', () => {
  it('sends the sort and filters with the page', () => {
    renderList({ page: 2, sort: { sort: 'created_at' }, filters: { cv: 'yes', status: 'new' } });
    expect(apiFetch).toHaveBeenCalledWith('/job-applicants?page=2&pageSize=25&sort=created_at&cv=yes&status=new');
  });

  it('every column sorts; a header click goes back to page 1', async () => {
    const onSearch = renderList(EMPTY);
    await screen.findByText('أ. منى');
    expect(screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: t.jobApplicants.createdAt }));
    expect(onSearch).toHaveBeenCalledWith({ page: 1, sort: { sort: 'created_at', dir: 'asc' }, filters: {} });
  });

  it('link columns filter by «attached / missing»', async () => {
    const onSearch = renderList(EMPTY);
    await screen.findByText('أ. منى');
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: label(t.jobApplicants.recitation) }), { target: { value: 'no' } });
    expect(onSearch).toHaveBeenCalledWith({ page: 1, sort: {}, filters: { recitation: 'no' } });
    expect(screen.getAllByRole('option', { name: t.jobApplicants.present })).toHaveLength(2);
  });

  it('no match under a filter: «not found» and the filters stay', async () => {
    renderList({ page: 1, sort: {}, filters: { name: 'زيد' } }, 0);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: label(t.jobApplicants.name) })).toBeTruthy();
  });
});
