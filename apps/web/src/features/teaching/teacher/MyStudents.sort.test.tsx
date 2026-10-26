import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { MyStudents } from './MyStudents';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const KIDS = [
  { id: 's1', code: 'AB-0002', name: 'يوسف', tz: 'Africa/Cairo', status: 'active' as const },
  { id: 's2', code: 'AB-0001', name: 'إيمان', tz: 'Asia/Riyadh', status: 'trial' as const },
];

const names = () => within(screen.getByRole('table')).getAllByRole('link').map((a) => a.textContent);
const label = (col: string) => t.table.filterBy.replace('{col}', col);

describe('MyStudents sort + filters (R-TCH-03, R-NFR-08)', () => {
  it('every column sorts the list', () => {
    render(<MyStudents students={KIDS} />);
    expect(screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: t.students.code }));
    expect(names()).toEqual(['إيمان', 'يوسف']);
    fireEvent.click(screen.getByRole('button', { name: t.students.code }));
    expect(names()).toEqual(['يوسف', 'إيمان']);
  });

  it('the status select filters; without the status column there is no status filter', () => {
    const { rerender } = render(<MyStudents students={KIDS} />);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: label(t.students.status) }), { target: { value: 'trial' } });
    expect(names()).toEqual(['إيمان']);
    rerender(<MyStudents students={KIDS} showStatus={false} />);
    expect(screen.queryByRole('combobox', { name: label(t.students.status) })).toBeNull();
    expect(screen.getByRole('searchbox', { name: label(t.students.name) })).toBeTruthy();
  });
});
