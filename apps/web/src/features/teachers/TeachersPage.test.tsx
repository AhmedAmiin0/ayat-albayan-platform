import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
import { TeachersPage } from './TeachersPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const FATMA: Teacher = {
  id: 't1',
  display_name_ar: 'فاطمة الزهراء',
  display_name_en: null,
  gender: 'female',
  programs: ['quran', 'islamic_studies'],
  phone_e164: '+201066123049',
  meeting_link: null,
  status: 'inactive',
  tz: 'Africa/Cairo',
  rate_30: 60,
  rate_45: null,
  rate_60: null,
  rate_90: null,
  max_students: 12,
};

function renderPage(page: { items: Teacher[]; total: number }) {
  apiFetch.mockResolvedValue({ ...page, page: 1, pageSize: 25 });
  const onOpen = vi.fn();
  const onPage = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeachersPage page={1} onOpen={onOpen} onPage={onPage} />
    </QueryClientProvider>,
  );
  return { onOpen, onPage };
}

describe('TeachersPage (R-TCH-01, docs/07 §6)', () => {
  it('titles the screen with the cartouche h1 and shows the real total', async () => {
    renderPage({ items: [FATMA], total: 1 });
    expect(screen.getByRole('heading', { level: 1, name: t.teachers.title })).toBeTruthy();
    expect(await screen.findByText(t.teachers.count.replace('{n}', '1'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers?page=1&pageSize=25');
  });

  it('renders a row: name + gender line, programs, LTR phone, status chip with its glyph', async () => {
    renderPage({ items: [FATMA], total: 1 });
    const row = (await screen.findByText('فاطمة الزهراء')).closest('tr');
    if (!row) throw new Error('row missing');
    const cells = within(row);
    expect(cells.getByText(t.teachers.genderLabel.female)).toBeTruthy();
    expect(cells.getByText(`${t.enums.program.quran}${t.teachers.listSeparator}${t.enums.program.islamic_studies}`)).toBeTruthy();
    expect(cells.getByText('+20 10 6612 3049').getAttribute('dir')).toBe('ltr');
    const chip = cells.getByText(t.enums.teacherStatus.inactive).parentElement;
    expect(chip?.querySelector('[data-glyph="struck"]')).toBeTruthy();
  });

  it('opens the profile from the name (keyboard path) and the row', async () => {
    const { onOpen } = renderPage({ items: [FATMA], total: 1 });
    fireEvent.click(await screen.findByRole('button', { name: 'فاطمة الزهراء' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('+20 10 6612 3049'));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenLastCalledWith('t1');
  });

  it('«تعديل» opens the edit dialog without opening the profile', async () => {
    const { onOpen } = renderPage({ items: [FATMA], total: 1 });
    fireEvent.click(await screen.findByRole('button', { name: `${t.common.edit} فاطمة الزهراء` }));
    expect(screen.getByRole('dialog', { name: t.teachers.edit })).toBeTruthy();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('pages through the shared Pager', async () => {
    const { onPage } = renderPage({ items: [FATMA], total: 60 });
    fireEvent.click(await screen.findByRole('button', { name: t.common.nextPage }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('an empty list shows the empty state, and «إضافة معلم/ة» opens the create dialog', async () => {
    renderPage({ items: [], total: 0 });
    expect(await screen.findByRole('heading', { name: t.teachers.empty })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.teachers.add }));
    expect(screen.getByRole('dialog', { name: t.teachers.add })).toBeTruthy();
  });
});
