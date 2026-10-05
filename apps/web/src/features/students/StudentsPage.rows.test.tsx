import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const ROW = {
  id: 's1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'trial',
  program: 'quran',
  tz: 'Asia/Riyadh',
  created_at: '2026-10-01T00:00:00Z',
  guardian_name: 'أم جود',
  guardian_phone: '+966501234567',
  teacher_name: null,
};

function renderPage(page: { items: object[]; total: number }, search = '') {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/students?') ? { ...page, page: 1, pageSize: 20 } : []),
  );
  const onOpen = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search={search} page={1} onChange={vi.fn()} onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return onOpen;
}

describe('StudentsPage rows (docs/07 §6 Data table)', () => {
  it('cartouche title, real count, status chip and an LTR code', async () => {
    renderPage({ items: [ROW], total: 45 });
    expect(screen.getByRole('heading', { level: 1, name: t.students.title })).toBeTruthy();
    expect(await screen.findByText(t.students.count.replace('{n}', '45'))).toBeTruthy();
    expect(screen.getByText('AB-0183').getAttribute('dir')).toBe('ltr');
    expect(within(screen.getByRole('table')).getByText(t.enums.studentStatus.trial).closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
  });

  it('no teacher: «يحتاج معلم/ة» in the hamish column and folded under the name', async () => {
    renderPage({ items: [ROW], total: 1 });
    await screen.findByText('سهيلة');
    expect(screen.getByRole('columnheader', { name: t.students.hamish })).toBeTruthy();
    expect(screen.getAllByText(t.alerts.needsTeacher)).toHaveLength(2);
  });

  it('«تعيين» and the row actions open the profile once; WhatsApp goes to the guardian', async () => {
    const onOpen = renderPage({ items: [ROW], total: 1 });
    fireEvent.click(await screen.findByRole('button', { name: t.students.assign }));
    fireEvent.click(screen.getByRole('button', { name: t.students.openProfile.replace('{name}', 'سهيلة') }));
    expect(onOpen).toHaveBeenCalledTimes(2);
    const wa = screen.getByRole('link', { name: t.students.whatsappTo.replace('{name}', 'أم جود') });
    expect(wa.getAttribute('href')).toBe('https://wa.me/966501234567');
  });

  it('a student with a teacher has no note and no «تعيين»', async () => {
    renderPage({ items: [{ ...ROW, teacher_name: 'أ. هبة', status: 'active' }], total: 1 });
    const row = (await screen.findByText('سهيلة')).closest('tr');
    expect(row && within(row).getByText('أ. هبة')).toBeTruthy();
    expect(screen.queryByText(t.alerts.needsTeacher)).toBeNull();
    expect(screen.queryByRole('button', { name: t.students.assign })).toBeNull();
  });

  it('empty academy: the empty state; empty search: «مش لاقيين»', async () => {
    renderPage({ items: [], total: 0 });
    expect(await screen.findByRole('heading', { name: t.students.empty })).toBeTruthy();
    screen.getByRole('heading', { name: t.students.title }); // still one screen title
  });

  it('a search with no results keeps the table and says nothing was found', async () => {
    renderPage({ items: [], total: 0 }, 'xyz');
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.students.empty })).toBeNull();
  });
});
