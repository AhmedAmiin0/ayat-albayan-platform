import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SUMMARY } from '../dashboard-fixture';
import { FinanceByMonth } from '../finance/FinanceByMonth';
import { sortRows, toggleSort } from './hand-sort';
import { SourceTable } from '../funnel/SourceTable';
import { TeacherLoad } from '../today/TeacherLoad';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../link-mock')).Link }));

const rowHeads = (name: string) =>
  within(screen.getByRole('table', { name })).getAllByRole('rowheader').map((h) => h.textContent);

describe('hand-sort', () => {
  it('toggleSort cycles asc → desc → none, and a new column starts at asc', () => {
    expect(toggleSort(null, 'a')).toEqual({ key: 'a', dir: 'asc' });
    expect(toggleSort({ key: 'a', dir: 'asc' }, 'a')).toEqual({ key: 'a', dir: 'desc' });
    expect(toggleSort({ key: 'a', dir: 'desc' }, 'a')).toBeNull();
    expect(toggleSort({ key: 'a', dir: 'desc' }, 'b')).toEqual({ key: 'b', dir: 'asc' });
  });

  it('sortRows: numbers numerically, Arabic names collated; none keeps the given order', () => {
    const rows = [{ n: 10, s: 'هبة' }, { n: 9, s: 'أبرار' }];
    expect(sortRows(rows, { key: 'n', dir: 'asc' }, (r, k: 'n' | 's') => r[k]).map((r) => r.n)).toEqual([9, 10]);
    expect(sortRows(rows, { key: 's', dir: 'desc' }, (r, k: 'n' | 's') => r[k]).map((r) => r.s)).toEqual(['هبة', 'أبرار']);
    expect(sortRows(rows, null, (r, k: 'n' | 's') => r[k])).toEqual(rows);
  });
});

describe('dashboard summary tables sort by any column (rows keep their row headers)', () => {
  it('source: leads asc puts «unknown» (0) first, then desc reverses; aria-sort follows', () => {
    render(<SourceTable rows={SUMMARY.finance.by_source} />);
    const name = t.dashboard.bySource;
    expect(rowHeads(name)).toEqual([t.enums.leadSource.facebook_ad, t.dashboard.unknownSource]);
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.leads }));
    expect(rowHeads(name)).toEqual([t.dashboard.unknownSource, t.enums.leadSource.facebook_ad]);
    expect(screen.getByRole('columnheader', { name: t.dashboard.leads }).getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.leads }));
    expect(rowHeads(name)).toEqual([t.enums.leadSource.facebook_ad, t.dashboard.unknownSource]);
  });

  it('months: newest first on the month header’s second click', () => {
    render(<FinanceByMonth months={SUMMARY.finance.by_month} currency="SAR" />);
    const month = screen.getByRole('button', { name: t.dashboard.month });
    fireEvent.click(month);
    fireEvent.click(month);
    const name = `${t.dashboard.byMonth} (SAR)`;
    const [first, second] = rowHeads(name);
    expect(first).not.toEqual(second);
    expect(screen.getByRole('columnheader', { name: t.dashboard.month }).getAttribute('aria-sort')).toBe('descending');
  });

  it('teacher load: by lessons', () => {
    const rows = [...SUMMARY.teacher_load, { teacher_id: 't2', display_name_ar: 'أبرار', lessons: 5, students: 1, max_students: null }];
    render(<TeacherLoad rows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.weekLessons }));
    expect(rowHeads(t.dashboard.teacherLoad)).toEqual(['فاطمة الزهراء', 'أبرار']);
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.weekLessons }));
    expect(rowHeads(t.dashboard.teacherLoad)).toEqual(['أبرار', 'فاطمة الزهراء']);
  });
});
