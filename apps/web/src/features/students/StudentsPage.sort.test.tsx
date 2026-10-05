import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { StudentsSearch } from './search';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ROW = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  program: 'quran',
  tz: 'Asia/Riyadh',
  created_at: '2026-10-01T00:00:00Z',
  guardian_name: 'أم جود',
  guardian_phone: '+966501234567',
  teacher_name: 'أبرار',
};

function renderPage(state: Partial<StudentsSearch>, total = 1) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/students?') ? { items: total ? [ROW] : [], total, page: 1, pageSize: 20 } : []),
  );
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search="" page={2} {...state} onChange={onChange} onOpen={vi.fn()} />
    </QueryClientProvider>,
  );
  return onChange;
}

const filterLabel = (col: string) => t.table.filterBy.replace('{col}', col);

describe('StudentsPage sort + column filters (R-NFR-08)', () => {
  it('sends sort, dir and the column filters to GET /students', () => {
    renderPage({ sort: { sort: 'guardian', dir: 'desc' }, columns: { code: '018' } });
    const qs = new URLSearchParams([['search', ''], ['page', '2'], ['pageSize', '20'], ['sort', 'guardian'], ['dir', 'desc'], ['code', '018']]);
    expect(apiFetch).toHaveBeenCalledWith(`/students?${qs}`);
  });

  it('six data columns sort; a header click goes to page 1 and keeps the filters', async () => {
    const onChange = renderPage({ filters: { program: 'quran' } });
    await screen.findByText('أم جود');
    expect(screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: t.students.teacher }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, filters: { program: 'quran' }, sort: { sort: 'teacher', dir: 'asc' } }),
    );
  });

  it('code, name and guardian have search boxes; program / teacher / status stay in the filter bar', async () => {
    renderPage({});
    await screen.findByText('أم جود');
    for (const col of [t.students.code, t.students.name, t.students.guardian]) {
      expect(screen.getByRole('searchbox', { name: filterLabel(col) })).toBeTruthy();
    }
    expect(screen.queryByRole('combobox', { name: filterLabel(t.students.teacher) })).toBeNull();
  });

  it('no match under a column filter: «not found», not the empty academy', async () => {
    renderPage({ columns: { name: 'زيد' } }, 0);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(screen.queryByText(t.students.empty)).toBeNull();
  });
});
