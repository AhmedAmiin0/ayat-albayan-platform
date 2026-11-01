import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { pupil, teacher } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesTeachers } from './SalesTeachers';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const TEACHERS = [
  teacher({
    live_now: true, active_count: 1, trial_count: 1,
    students: [
      pupil(),
      pupil({ id: 's2', code: 'AB-0190', name: 'جود', status: 'trial', next_lesson_at: null }),
      pupil({ id: 's3', code: 'AB-0191', name: 'ريم', status: 'paused' }),
    ],
  }),
  teacher({ id: 'tc2', name: 'محمد', name_en: 'Mohamed', gender: 'male', programs: ['islamic_studies'], lessons_today: 0, students: [], active_count: 0, meeting_link: null }),
];
const counts = (active: number, trial: number) => t.studentLists.counts.replace('{active}', String(active)).replace('{trial}', String(trial));

afterEach(() => apiFetch.mockReset());

describe('SalesTeachers «المعلمون» (master-detail)', () => {
  it('lists teachers with gender, programs, «مشترك n · تجريبي n» and «في حلقة الآن»; never students in the row', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    const list = await screen.findByRole('list', { name: t.sales.teachers.listLabel });
    expect(apiFetch).toHaveBeenCalledWith('/sales/teachers');
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain(t.sales.teachers.liveNow);
    expect(rows[0]?.textContent).toContain(counts(1, 1));
    expect(rows[1]?.textContent).toContain(counts(0, 0));
    expect(rows[0]?.textContent).toContain(t.sales.teachers.lessonsToday.replace('{n}', '2'));
    expect(rows[0]?.textContent).toContain(`${t.teachers.genderLabel.female} · ${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`);
    expect(rows[1]?.textContent).not.toContain(t.sales.teachers.liveNow);
    expect(screen.queryByText('سهيلة')).toBeNull();
  });

  it('a teacher opens a drawer: «مشترك» first, then trial and all (paused included), next lesson in Riyadh time', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    fireEvent.click(await screen.findByRole('button', { name: /أبرار/ }));
    const drawer = screen.getByRole('dialog', { name: t.sales.teachers.detailTitle.replace('{name}', 'أبرار') });
    const kinds = within(drawer).getByRole('group', { name: t.studentLists.kinds });
    const seg = (label: string) => within(kinds).getByRole('button', { name: new RegExp(label) });
    expect(seg(t.studentLists.active).getAttribute('aria-pressed')).toBe('true');
    expect([seg(t.studentLists.active), seg(t.studentLists.trial), seg(t.studentLists.all)].map((b) => b.textContent)).toEqual([
      `${t.studentLists.active}1`, `${t.studentLists.trial}1`, `${t.studentLists.all}3`,
    ]);
    expect(within(drawer).getByText('AB-0183').getAttribute('dir')).toBe('ltr');
    expect(within(drawer).getByText('الاثنين 12 أكتوبر 18:00')).toBeTruthy();
    expect(within(drawer).queryByText('جود')).toBeNull();
    fireEvent.click(seg(t.studentLists.trial));
    expect(within(drawer).getByText('جود')).toBeTruthy();
    expect(within(drawer).queryByText('سهيلة')).toBeNull();
    expect(within(drawer).getByText(t.sales.teachers.noNextLesson)).toBeTruthy();
    fireEvent.click(seg(t.studentLists.all));
    expect(['سهيلة', 'جود', 'ريم'].every((n) => within(drawer).queryByText(n))).toBe(true);
    expect(within(drawer).getByRole('link', { name: t.sales.teachers.openSchedule }).getAttribute('href')).toBe('/sales/schedule?teacherId=tc1');
    expect(drawer.textContent).not.toMatch(/\+966|\+20/);
    fireEvent.click(within(drawer).getByRole('button', { name: t.common.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a teacher with no students: empty per kind, and «لا يوجد رابط ثابت»; reopening resets to «مشترك»', async () => {
    apiFetch.mockResolvedValue(TEACHERS);
    renderWithQuery(<SalesTeachers />);
    fireEvent.click(await screen.findByRole('button', { name: /أبرار/ }));
    const kinds = screen.getByRole('group', { name: t.studentLists.kinds });
    fireEvent.click(within(kinds).getByRole('button', { name: new RegExp(t.studentLists.trial) }));
    fireEvent.click(screen.getByRole('button', { name: /محمد/ }));
    const drawer = screen.getByRole('dialog', { name: t.sales.teachers.detailTitle.replace('{name}', 'محمد') });
    expect(within(drawer).getByText(t.studentLists.emptyActive)).toBeTruthy();
    expect(within(drawer).getByText(t.studentLists.meetingLinkNone)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: new RegExp(t.studentLists.trial) }));
    expect(within(drawer).getByText(t.studentLists.emptyTrial)).toBeTruthy();
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
