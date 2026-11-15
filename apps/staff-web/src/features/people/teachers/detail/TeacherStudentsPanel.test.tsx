import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { remainingLabel } from './teacher-student-columns';
import { statusSummary, TeacherStudentsPanel } from './TeacherStudentsPanel';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
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
  guardian_name: 'أم جود',
  guardian_phone: '+966501234567',
  teacher_name: 'أبرار',
  package_remaining: 3,
  has_weekly: true,
};
const COUNTS = { new: 1, trial: 3, pending_subscription: 0, active: 12, pending_renewal: 2, expired: 1, paused: 0, churned: 5 };
const E = t.enums.studentStatus;

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

describe('TeacherStudentsPanel (R-TCH-03)', () => {
  it('lists her current students (not subscribed yet + subscribed + package ended) with the counts per status', async () => {
    renderPanel();
    expect(await screen.findByText(`1 ${E.new} · 3 ${E.trial} · 12 ${E.active} · 2 ${E.pending_renewal} · 1 ${E.expired} · 5 ${E.churned}`)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students?search=&page=1&pageSize=20&status=new%2Ctrial%2Cpending_subscription%2Cactive%2Cpending_renewal%2Cexpired&teacher=t1');
    expect(apiFetch).toHaveBeenCalledWith('/students/status-counts?teacher=t1');
    expect(screen.getByText(t.students.count.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: `${E.active}12` })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: `${E.pending_renewal}2` })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: `${E.paused}0` })).toHaveProperty('checked', false);
  });

  it('rows: code, name linking to the profile, status, package left, weekly', async () => {
    renderPanel();
    const table = await screen.findByRole('table');
    const link = await within(table).findByRole('link', { name: 'سهيلة' });
    expect(link.getAttribute('href')).toBe('/admin/students/s1');
    expect(within(table).getByText('AB-0183')).toBeTruthy();
    expect(within(table).getByText(remainingLabel(3))).toBeTruthy();
    expect(within(table).getByText(t.common.yes)).toBeTruthy();
  });

  it('«عرض كل الحالات» drops the status filter; the link opens the students page on her', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: t.teachers.studentsShowAll }));
    expect(apiFetch).toHaveBeenLastCalledWith('/students?search=&page=1&pageSize=20&teacher=t1');
    expect(screen.getByRole('button', { name: t.teachers.studentsShowCurrent })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.teachers.studentsViewAll }).getAttribute('href')).toBe('/admin/students?teacher=t1');
  });

  it('statusSummary skips empty statuses; remainingLabel says «بدون باقة» without one', () => {
    expect(statusSummary({ new: 0, trial: 0, pending_subscription: 0, active: 2, pending_renewal: 0, expired: 0, paused: 1, churned: 0 })).toBe(`2 ${E.active} · 1 ${E.paused}`);
    expect(remainingLabel(null)).toBe(t.students.noPackage);
    expect(remainingLabel(0)).toBe(t.students.remainingN.replace('{n}', '0'));
  });
});
