import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { FACTS, kid, ME, MISSED, NEXT, renderBoard, rowOf, when } from './board-fixture';

const navigate = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => navigate,
}));

const kinds = () => screen.getByRole('group', { name: t.teacherBoard.kinds });
const segment = (label: string, n: number) =>
  within(kinds()).getByRole('button', { name: new RegExp(`${label}\\s*${n}`) });

describe('TeacherBoard «طلابي» (docs/46 C1, docs/48)', () => {
  beforeEach(() => {
    navigate.mockReset();
    apiFetch.mockReset().mockImplementation(FACTS);
  });

  it('one row per current student with her lessons grouped from the one window', () => {
    renderBoard();
    const row = rowOf('سهيلة');
    expect(within(row).getByText('AB-s-1')).toBeTruthy();
    expect(within(row).getByText(when(MISSED.starts_at))).toBeTruthy();
    expect(within(row).getByText(t.sales.student.kind.absent)).toBeTruthy();
    expect(within(row).getByText(when(NEXT.starts_at))).toBeTruthy();
    expect(within(row).getByText(t.enums.reportStatus.submitted)).toBeTruthy();
    expect(within(row).getByText('حضر 1 · غاب 1')).toBeTruthy();
    expect(within(row).getByText(t.teacherBoard.rate.replace('{rate}', '50'))).toBeTruthy();
    // Paused students are not current (D4).
    expect(screen.queryByRole('link', { name: 'ريم' })).toBeNull();
  });

  it('the facts line under the name; no «مشترك» chip, every other status keeps its chip', async () => {
    renderBoard();
    expect(await within(rowOf('سهيلة')).findByText(/جزء عمّ · 9 سنوات/)).toBeTruthy();
    expect(await within(rowOf('جود')).findByText(`${t.enums.program.arabic} · سنتان`)).toBeTruthy();
    expect(within(screen.getByRole('table')).queryByText(t.enums.studentStatus.active)).toBeNull();
    expect(within(rowOf('جود')).getByText(t.enums.studentStatus.trial)).toBeTruthy();
  });

  it('«مشترك» counts only active; «الكل» keeps pending_renewal and expired with chips', () => {
    renderBoard();
    expect(segment(t.studentLists.all, 4).getAttribute('aria-pressed')).toBe('true');
    expect(within(rowOf('مريم')).getByText(t.enums.studentStatus.pending_renewal)).toBeTruthy();
    expect(within(rowOf('هند')).getByText(t.enums.studentStatus.expired)).toBeTruthy();
    fireEvent.click(segment(t.studentLists.active, 1));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    fireEvent.click(segment(t.studentLists.trial, 1));
    expect(screen.queryByRole('link', { name: 'سهيلة' })).toBeNull();
    expect(screen.getByRole('link', { name: 'جود' })).toBeTruthy();
  });

  it('soonest next lesson first, then the rest by name', () => {
    renderBoard();
    const names = screen.getAllByRole('link').map((a) => a.textContent);
    expect(names).toEqual(['سهيلة', 'جود', 'مريم', 'هند']);
  });

  it('a row opens the student file; the name is a link to it', () => {
    renderBoard();
    expect(screen.getByRole('link', { name: 'جود' }).getAttribute('href')).toBe('/teacher/students/s-2');
    fireEvent.click(rowOf('سهيلة'));
    expect(navigate).toHaveBeenCalledWith({ to: '/teacher/students/$studentId', params: { studentId: 's-1' } });
  });

  it('an empty segment says so with one hint sentence; no window caption', () => {
    renderBoard({ ...ME, students: [kid('s-3', 'ريم', 'churned')] });
    expect(screen.getByText(t.teacherBoard.noStudents)).toBeTruthy();
    expect(screen.getByText(t.teacherBoard.emptyHint)).toBeTruthy();
    fireEvent.click(segment(t.studentLists.trial, 0));
    expect(screen.getByText(t.studentLists.emptyTrial)).toBeTruthy();
  });
});
