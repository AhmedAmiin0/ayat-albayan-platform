import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ROW = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  program: 'quran',
  tz: 'Asia/Riyadh',
  created_at: '2026-10-01T00:00:00Z',
  guardian_name: 'ام جود',
  guardian_phone: '+966501234567',
  teacher_name: null,
};

function renderPage(props: { search?: string; page?: number } = {}) {
  const page = { items: [ROW], total: 45, page: props.page ?? 1, pageSize: 20 };
  apiFetch.mockImplementation((path: string) => Promise.resolve(path.startsWith('/students?') ? page : []));
  const onChange = vi.fn();
  const onOpen = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search={props.search ?? ''} page={props.page ?? 1} onChange={onChange} onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return { onChange, onOpen };
}

describe('StudentsPage (R-STU-01, R-NFR-08)', () => {
  it('lists students with Arabic enum labels and opens a profile on click', async () => {
    const { onOpen } = renderPage();
    fireEvent.click(await screen.findByText('سهيلة'));
    expect(onOpen).toHaveBeenCalledWith('s1');
    expect(within(screen.getByRole('table')).getByText(t.enums.studentStatus.active)).toBeTruthy();
    expect(screen.getByText(t.students.noTeacher)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students?search=&page=1&pageSize=20');
  });

  it('search resets to page 1', async () => {
    const { onChange } = renderPage({ page: 2 });
    fireEvent.change(screen.getByRole('textbox', { name: t.common.search }), { target: { value: ' 0501 ' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(onChange).toHaveBeenCalledWith({ search: '0501', page: 1, filters: {} });
  });

  it('pages through 45 results 20 at a time', async () => {
    const { onChange } = renderPage({ page: 3 });
    await screen.findByText(t.common.showing.replace('{shown}', '5').replace('{total}', '45'));
    expect(screen.getByRole('button', { current: 'page' }).textContent).toBe('3');
    expect(screen.getByRole('button', { name: t.common.nextPage })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: t.common.prevPage }));
    expect(onChange).toHaveBeenCalledWith({ search: '', page: 2, filters: {} });
  });

  it('the add button opens the create dialog', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: t.students.add }));
    expect(screen.getByRole('dialog', { name: t.students.add })).toBeTruthy();
  });
});
