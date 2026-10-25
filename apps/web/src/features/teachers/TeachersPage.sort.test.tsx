import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import type { ListUrlState } from '@/lib/list/list-url';
import { TeachersPage } from './TeachersPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const ROW = {
  id: 't1',
  display_name_ar: 'فاطمة',
  display_name_en: null,
  gender: 'female',
  programs: ['quran'],
  phone_e164: '+201066123049',
  meeting_link: null,
  status: 'active',
  tz: 'Africa/Cairo',
  max_students: 12,
};

function renderPage(list: ListUrlState, total = 1) {
  apiFetch.mockResolvedValue({ items: total ? [ROW] : [], total, page: list.page, pageSize: 25 });
  const onList = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeachersPage list={list} onOpen={vi.fn()} onList={onList} />
    </QueryClientProvider>,
  );
  return onList;
}

describe('TeachersPage sort + column filters (R-NFR-08)', () => {
  it('sends the sort and filters with the page to GET /teachers', () => {
    renderPage({ page: 2, sort: { sort: 'max_students', dir: 'desc' }, filters: { status: 'active', name: 'فاط' } });
    const qs = new URLSearchParams([['page', '2'], ['pageSize', '25'], ['sort', 'max_students'], ['dir', 'desc'], ['status', 'active'], ['name', 'فاط']]);
    expect(apiFetch).toHaveBeenCalledWith(`/teachers?${qs}`);
  });

  it('a header click sorts on page 1; every data column sorts', async () => {
    const onList = renderPage({ page: 3, sort: {}, filters: {} });
    await screen.findByText('فاطمة');
    const sortable = screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'));
    expect(sortable).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: t.teachers.maxStudents }));
    expect(onList).toHaveBeenCalledWith({ page: 1, sort: { sort: 'max_students', dir: 'asc' }, filters: {} });
  });

  it('a select filter goes back to page 1', async () => {
    const onList = renderPage({ page: 3, sort: {}, filters: {} });
    await screen.findByText('فاطمة');
    const label = t.table.filterBy.replace('{col}', t.teachers.status);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: 'inactive' } });
    expect(onList).toHaveBeenCalledWith({ page: 1, sort: {}, filters: { status: 'inactive' } });
  });

  it('no match under a filter keeps the filters (not the empty-academy state)', async () => {
    renderPage({ page: 1, sort: {}, filters: { programs: 'arabic' } }, 0);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.teachers.empty })).toBeNull();
  });
});
