import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { StudentsFilters } from './filters';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

function renderPage(filters: StudentsFilters, total = 0) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/students?') ? { items: [], total, page: 3, pageSize: 20 } : []),
  );
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search="سهيلة" page={3} filters={filters} onChange={onChange} onOpen={vi.fn()} />
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

  it('a filter change keeps the search and goes back to page 1', () => {
    const onChange = renderPage({ teacher: 'none' });
    fireEvent.click(screen.getByRole('checkbox', { name: t.enums.studentStatus.paused }));
    expect(onChange).toHaveBeenCalledWith({ search: 'سهيلة', page: 1, filters: { teacher: 'none', status: 'paused' } });
  });

  it('no match under a filter: the table says not found (not the empty academy state), with the count', async () => {
    renderPage({ weekly: 'yes' }, 0);
    expect(await screen.findByText(t.students.count.replace('{n}', '0'))).toBeTruthy();
    expect(screen.queryByText(t.students.empty)).toBeNull();
    expect(screen.getByText(t.common.notFound)).toBeTruthy();
  });
});
