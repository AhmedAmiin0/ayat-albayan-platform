import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { TeacherListRow } from './api';
import { TeachersPage } from './TeachersPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const ABRAR: TeacherListRow = {
  id: 't-abrar',
  display_name_ar: 'أبرار',
  display_name_en: null,
  gender: 'female',
  programs: ['quran'],
  phone_e164: null,
  meeting_link: null,
  status: 'active',
  tz: 'Africa/Cairo',
  rate_30: 60,
  rate_45: null,
  rate_60: null,
  rate_90: null,
  max_students: 12,
  active_count: 7,
  trial_count: 2,
};

function renderPage() {
  apiFetch.mockResolvedValue({ items: [ABRAR], total: 1, page: 1, pageSize: 25 });
  const onOpen = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeachersPage list={{ page: 1, sort: {}, filters: {} }} onOpen={onOpen} onList={vi.fn()} />
    </QueryClientProvider>,
  );
  return { onOpen };
}

const link = (key: 'activeLink' | 'trialLink', n: number) =>
  screen.getByRole('link', { name: t.studentLists[key].replace('{name}', 'أبرار').replace('{n}', String(n)) });

describe('TeachersPage «مشترك · تجريبي» columns (R-TCH-03, owner 2026-10-12)', () => {
  it('heads the two columns, not sortable, and shows the counts in the row', async () => {
    renderPage();
    const row = (await screen.findByText('أبرار')).closest('tr');
    if (!row) throw new Error('row missing');
    const active = screen.getByRole('columnheader', { name: t.studentLists.active });
    const trial = screen.getByRole('columnheader', { name: t.studentLists.trial });
    expect(within(active).queryByRole('button')).toBeNull();
    expect(within(trial).queryByRole('button')).toBeNull();
    expect(within(row).getByText('7')).toBeTruthy();
    expect(within(row).getByText('2')).toBeTruthy();
  });

  it('each count links to the students list filtered by teacher and status', async () => {
    renderPage();
    await screen.findByText('أبرار');
    expect(link('activeLink', 7).getAttribute('href')).toBe('/admin/students?teacher=t-abrar&status=active');
    expect(link('trialLink', 2).getAttribute('href')).toBe('/admin/students?teacher=t-abrar&status=new%2Ctrial%2Cpending_subscription');
  });

  it('a count click follows its link, not the row (the row opens the profile)', async () => {
    const { onOpen } = renderPage();
    await screen.findByText('أبرار');
    const a = link('activeLink', 7);
    a.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(a);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('7').closest('td') ?? document.body);
    expect(onOpen).toHaveBeenCalledWith('t-abrar');
  });
});
