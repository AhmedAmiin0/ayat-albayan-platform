import { counted } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearAllFilters, closeFilters, openFilters } from '@/test/open-filters';
import { T_ABRAR, T_FATMA, T_NOUR } from '../overview-fixture';
import { ScheduleFilters } from './ScheduleFilters';
import type { ScheduleSearch } from './search';

const ALL = [T_ABRAR, T_FATMA, T_NOUR];
const chip = (label: string, value: string) =>
  t.table.removeFilter.replace('{filter}', t.table.activeFilter.replace('{label}', label).replace('{value}', value));

function renderFilters(search: ScheduleSearch = {}, resultCount?: number) {
  const onSearch = vi.fn();
  render(<ScheduleFilters search={search} teachers={ALL} onSearch={onSearch} resultCount={resultCount} />);
  return onSearch;
}

describe('ScheduleFilters on the shared toolbar', () => {
  it('one «تصفية» button; no select or checkbox in the page until the panel opens', () => {
    renderFilters();
    expect(screen.getByRole('button', { name: t.table.filter })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('the panel holds teachers, program, gender, status and the closed toggle; each reports a patch', () => {
    const onSearch = renderFilters({});
    openFilters();
    fireEvent.change(screen.getByLabelText(t.schedule.programFilter), { target: { value: 'quran' } });
    expect(onSearch).toHaveBeenLastCalledWith({ program: 'quran' });
    fireEvent.change(screen.getByLabelText(t.teachers.gender), { target: { value: 'male' } });
    expect(onSearch).toHaveBeenLastCalledWith({ gender: 'male' });
    fireEvent.change(screen.getByLabelText(t.schedule.statusFilter), { target: { value: 'confirmed' } });
    expect(onSearch).toHaveBeenLastCalledWith({ status: 'confirmed' });
    fireEvent.click(screen.getByRole('checkbox', { name: t.schedule.showClosed }));
    expect(onSearch).toHaveBeenLastCalledWith({ closed: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'نور' }));
    expect(onSearch).toHaveBeenLastCalledWith({ teachers: ['t-nour'] });
    fireEvent.change(screen.getByLabelText(t.schedule.programFilter), { target: { value: '' } });
    expect(onSearch).toHaveBeenLastCalledWith({ program: undefined });
  });

  it('the teacher list opens in the flow inside the panel (not floating over the fields below it)', () => {
    renderFilters({});
    openFilters();
    const list = screen.getByRole('checkbox', { name: 'نور' }).closest('fieldset');
    expect(list?.className).toContain('max-h-56');
    expect(list?.className).not.toContain('absolute');
  });

  it('every set filter is a chip with its own wording; each removes only itself', () => {
    const onSearch = renderFilters({ teachers: ['t-nour', 't-abrar'], program: 'quran', gender: 'female', status: 'confirmed', closed: true });
    const chips = screen.getByRole('list', { name: t.table.activeFilters });
    expect(chips.querySelectorAll('li')).toHaveLength(6); // five chips + «مسح الكل»
    fireEvent.click(screen.getByRole('button', { name: chip(t.schedule.teacherFilter, counted(t.schedule.teachersPicked, 2)) }));
    expect(onSearch).toHaveBeenLastCalledWith({ teachers: undefined });
    fireEvent.click(screen.getByRole('button', { name: chip(t.schedule.statusFilter, t.enums.lessonStatus.confirmed) }));
    expect(onSearch).toHaveBeenLastCalledWith({ status: undefined });
    fireEvent.click(screen.getByRole('button', { name: chip(t.schedule.showClosed, t.common.yes) }));
    expect(onSearch).toHaveBeenLastCalledWith({ closed: undefined });
    expect(screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) }).textContent).toContain('5');
  });

  it('«مسح الكل» drops all five filters and leaves the week alone', () => {
    const onSearch = renderFilters({ week: '2026-10-10', program: 'quran', closed: true });
    clearAllFilters();
    expect(onSearch).toHaveBeenLastCalledWith({ teachers: undefined, program: undefined, gender: undefined, status: undefined, closed: undefined });
  });

  it('«عرض النتائج (N)» counts the lessons shown, and is plain while the week loads', () => {
    const { unmount } = render(<ScheduleFilters search={{ program: 'quran' }} teachers={ALL} onSearch={vi.fn()} resultCount={14} />);
    openFilters();
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '14') })).toBeTruthy();
    closeFilters();
    unmount();
    renderFilters({ program: 'quran' });
    openFilters();
    expect(screen.getByRole('button', { name: t.table.showResults })).toBeTruthy();
  });
});
