import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearAllFilters, openFilters } from '@/test/open-filters';
import { TeacherStudentsPanel } from './TeacherStudentsPanel';
import { panelView } from './teacher-students-view';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ROW = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', program: 'quran', package_remaining: 3, has_weekly: true };
const COUNTS = { new: 0, trial: 0, pending_subscription: 0, active: 1, pending_renewal: 0, expired: 0, paused: 0, churned: 0 };

function renderPanel() {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/students/status-counts') ? COUNTS : { items: [ROW], total: 1, page: 1, pageSize: 20 }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherStudentsPanel teacherId="t1" />
    </QueryClientProvider>,
  );
}

const label = (col: string) => t.table.filterBy.replace('{col}', col);
const BASE = '/students?search=&page=1&pageSize=20&status=new%2Ctrial%2Cpending_subscription%2Cactive%2Cpending_renewal%2Cexpired&teacher=t1';

describe('TeacherStudentsPanel sort + column filters (R-TCH-03, R-NFR-08)', () => {
  it('every column sorts server-side', async () => {
    renderPanel();
    await screen.findByText('AB-0183');
    expect(screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: t.students.remaining }));
    expect(apiFetch).toHaveBeenLastCalledWith(`${BASE}&sort=remaining`);
  });

  it('package left and weekly filter through the list filters; the code through its search box', async () => {
    renderPanel();
    await screen.findByText('AB-0183');
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: label(t.students.remaining) }), { target: { value: 'low' } });
    expect(apiFetch).toHaveBeenLastCalledWith(`${BASE}&package=low`);
    fireEvent.change(screen.getByRole('combobox', { name: label(t.students.weekly) }), { target: { value: 'no' } });
    expect(apiFetch).toHaveBeenLastCalledWith(`${BASE}&package=low&weekly=no`);
    clearAllFilters();
    await vi.waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith(BASE));
  });

  it('the name is the search box; the code waits in the panel', async () => {
    renderPanel();
    await screen.findByText('AB-0183');
    expect(screen.getByRole('searchbox', { name: label(t.students.name) })).toBeTruthy();
    expect(screen.queryByRole('searchbox', { name: label(t.students.code) })).toBeNull();
  });

  it('panelView: unknown select values are dropped, text filters stay column filters', () => {
    const view = panelView({ teacherId: 't1', statuses: [], sort: {}, columns: { package: 'free', weekly: 'yes', code: '01' } });
    expect(view.filters).toEqual({ teacher: 't1', status: undefined, package: undefined, weekly: 'yes' });
    expect(view.columns).toEqual({ code: '01' });
  });
});
