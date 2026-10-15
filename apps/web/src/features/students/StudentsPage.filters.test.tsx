import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { openFilters } from '@/test/open-filters';
import type { StudentsFilters } from './filters';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const COUNTS = { new: 1, trial: 2, pending_subscription: 1, active: 9, pending_renewal: 0, expired: 1, paused: 1, churned: 0 };

function renderPage(filters: StudentsFilters, total = 0, search = 'سهيلة') {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/students/status-counts')) return Promise.resolve(COUNTS);
    return Promise.resolve(path.startsWith('/students?') ? { items: [], total, page: 3, pageSize: 20 } : []);
  });
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search={search} page={3} filters={filters} onChange={onChange} onOpen={vi.fn()} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('StudentsPage filters (R-STU-01)', () => {
  it('sends the filters with the search and page to GET /students', () => {
    renderPage({ status: 'trial,active', teacher: 'none', package: 'unpaid' });
    const qs = new URLSearchParams({ search: 'سهيلة', page: '3', pageSize: '20', status: 'trial,active', teacher: 'none', package: 'unpaid' });
    expect(apiFetch).toHaveBeenCalledWith(`/students?${qs}`);
  });

  it('a filter change keeps the search and goes back to page 1', async () => {
    const onChange = renderPage({ teacher: 'none' });
    await screen.findByText(t.common.notFound);
    openFilters();
    fireEvent.click(screen.getByRole('checkbox', { name: t.enums.studentStatus.paused }));
    expect(onChange).toHaveBeenCalledWith({ search: 'سهيلة', page: 1, filters: { teacher: 'none', status: 'paused' } });
  });

  it('no match under a filter: the table says not found (not the empty academy state), with the count', async () => {
    renderPage({ weekly: 'yes' }, 0);
    expect(await screen.findByText(t.students.count.replace('{n}', '0'))).toBeTruthy();
    expect(screen.queryByText(t.students.empty)).toBeNull();
    expect(screen.getByText(t.common.notFound)).toBeTruthy();
  });

  it('set filters show as chips; «مسح الكل» drops them all and keeps the search', async () => {
    const onChange = renderPage({ teacher: 'none', status: 'paused' });
    const chips = await screen.findByRole('list', { name: t.table.activeFilters });
    expect(chips.textContent).toContain(`${t.students.teacher}: ${t.students.teacherNone}`);
    expect(screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) }).textContent).toContain('2');
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(onChange).toHaveBeenCalledWith({ search: 'سهيلة', page: 1, filters: {}, columns: {} });
  });

  it('«الكل · مشترك · تجريبي» in the toolbar, without «تصفية»: on the status filter, counts under the other filters', async () => {
    const onChange = renderPage({ teacher: 'none', status: 'paused' }, 0, '');
    const group = screen.getByRole('group', { name: t.studentLists.kinds });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(group.querySelector('[aria-pressed="true"]')).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/students/status-counts?teacher=none');
    const active = await within(group).findByRole('button', { name: `${t.studentLists.active}9` });
    fireEvent.click(active);
    expect(onChange).toHaveBeenCalledWith({ search: '', page: 1, filters: { teacher: 'none', status: 'active' } });
    fireEvent.click(within(group).getByRole('button', { name: `${t.studentLists.trial}4` }));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', page: 1, filters: { teacher: 'none', status: 'new,trial,pending_subscription' } });
    fireEvent.click(within(group).getByRole('button', { name: `${t.studentLists.all}15` }));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', page: 1, filters: { teacher: 'none' } });
  });

  it('under a search the segments show no numbers (the counts would not match the list)', async () => {
    renderPage({ teacher: 'none' });
    await screen.findByText(t.common.notFound);
    const group = screen.getByRole('group', { name: t.studentLists.kinds });
    expect(within(group).getByRole('button', { name: t.studentLists.active })).toBeTruthy();
    expect(group.textContent).not.toMatch(/\d/);
  });
});
