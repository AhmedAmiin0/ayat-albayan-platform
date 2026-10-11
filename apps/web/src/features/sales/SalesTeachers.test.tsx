import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { pupil, teacher } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { SalesTeachers } from './SalesTeachers';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const TEACHERS = [
  teacher({ live_now: true, students: [pupil(), pupil({ id: 's2', code: 'AB-0190', name: 'جود', status: 'trial', next_lesson_at: null })] }),
  teacher({ id: 'tc2', name: 'محمد', name_en: 'Mohamed', gender: 'male', programs: ['islamic_studies'], lessons_today: 0, students: [] }),
];

afterEach(() => apiFetch.mockReset());

describe('SalesTeachers «المعلمون» (master-detail)', () => {
  it('lists teachers with gender, programs, counts and «في حلقة الآن»; never students in the row', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    const list = await screen.findByRole('list', { name: t.sales.teachers.listLabel });
    expect(apiFetch).toHaveBeenCalledWith('/sales/teachers');
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain(t.sales.teachers.liveNow);
    expect(rows[0]?.textContent).toContain(t.sales.teachers.studentsCount.replace('{n}', '2'));
    expect(rows[0]?.textContent).toContain(t.sales.teachers.lessonsToday.replace('{n}', '2'));
    expect(rows[0]?.textContent).toContain(`${t.teachers.genderLabel.female} · ${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`);
    expect(rows[1]?.textContent).not.toContain(t.sales.teachers.liveNow);
    expect(screen.queryByText('سهيلة')).toBeNull();
  });

  it('a teacher opens a drawer with their students: code, program, status incl. trial, next lesson in Riyadh time', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    fireEvent.click(await screen.findByRole('button', { name: /أبرار/ }));
    const drawer = screen.getByRole('dialog', { name: t.sales.teachers.detailTitle.replace('{name}', 'أبرار') });
    expect(within(drawer).getByText('AB-0183').getAttribute('dir')).toBe('ltr');
    expect(within(drawer).getByText(t.enums.studentStatus.trial)).toBeTruthy();
    expect(within(drawer).getByText('الاثنين 12 أكتوبر 18:00')).toBeTruthy();
    expect(within(drawer).getByText(t.sales.teachers.noNextLesson)).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: t.sales.teachers.openSchedule }).getAttribute('href')).toBe('/sales/schedule?teacherId=tc1');
    expect(drawer.textContent).not.toMatch(/\+966|\+20|meet|http/);
    fireEvent.click(within(drawer).getByRole('button', { name: t.common.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('searches by name and filters by program and gender; no match offers to clear', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    const search = await screen.findByRole('searchbox', { name: t.sales.teachers.search });
    fireEvent.change(search, { target: { value: 'محمد' } });
    expect(screen.getAllByRole('button', { name: /محمد/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /أبرار/ })).toBeNull();
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: t.sales.teachers.programs }), { target: { value: 'quran' } });
    fireEvent.change(screen.getByRole('combobox', { name: t.sales.teachers.gender }), { target: { value: 'male' } });
    expect(screen.getByText(t.sales.teachers.noMatch)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.sales.teachers.clearFilters }));
    expect(within(screen.getByRole('list', { name: t.sales.teachers.listLabel })).getAllByRole('button')).toHaveLength(2);
  });

  it('the empty state when there is no active teacher, and an error with retry', async () => {
    apiFetch.mockResolvedValueOnce([]);
    const { unmount } = renderWithQuery(<SalesTeachers />);
    expect(await screen.findByText(t.sales.teachers.empty)).toBeTruthy();
    unmount();
    apiFetch.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    fireEvent.click(await screen.findByRole('button', { name: t.sales.retry }));
    expect(await screen.findByRole('list', { name: t.sales.teachers.listLabel })).toBeTruthy();
  });
});
