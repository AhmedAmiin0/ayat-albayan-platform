import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { StudentsFilters } from './filters';
import { StudentFilterBar } from './StudentFilterBar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const T = '11111111-1111-4111-8111-111111111111';
const s = t.students;

function renderBar(value: StudentsFilters = {}) {
  apiFetch.mockResolvedValue([{ id: T, display_name_ar: 'أبرار', meeting_link: null }]);
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentFilterBar value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('StudentFilterBar (R-STU-01)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('status chips add to the comma-joined status', () => {
    const onChange = renderBar({ status: 'trial' });
    expect(screen.getByRole('checkbox', { name: t.enums.studentStatus.trial })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('checkbox', { name: t.enums.studentStatus.active }));
    expect(onChange).toHaveBeenCalledWith({ status: 'trial,active' });
  });

  it('teacher select lists «بدون معلم» and the teachers', async () => {
    const onChange = renderBar({ program: 'quran' });
    const select = screen.getByRole('combobox', { name: s.teacher });
    await within(select).findByRole('option', { name: 'أبرار' });
    fireEvent.change(select, { target: { value: 'none' } });
    expect(onChange).toHaveBeenCalledWith({ program: 'quran', teacher: 'none' });
    fireEvent.change(select, { target: { value: T } });
    expect(onChange).toHaveBeenLastCalledWith({ program: 'quran', teacher: T });
    expect(within(select).getByRole('option', { name: s.teacherNone })).toBeTruthy();
  });

  it('package and weekly selects; «الكل» removes the filter', () => {
    const onChange = renderBar({ weekly: 'yes' });
    fireEvent.change(screen.getByRole('combobox', { name: s.package }), { target: { value: 'low' } });
    expect(onChange).toHaveBeenCalledWith({ weekly: 'yes', package: 'low' });
    fireEvent.change(screen.getByRole('combobox', { name: s.weekly }), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('«مسح الفلاتر» only with a filter set, and it clears them all', () => {
    renderBar();
    expect(screen.queryByRole('button', { name: s.clearFilters })).toBeNull();
    const onChange = renderBar({ teacher: 'none', status: 'paused' });
    fireEvent.click(screen.getByRole('button', { name: s.clearFilters }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('phones: a «فلاتر» button with the count opens the filters in a sheet', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const onChange = renderBar({ teacher: 'none', weekly: 'no' });
    expect(screen.queryByRole('combobox', { name: s.teacher })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${s.filters}\\s*\\(2\\)$`) }));
    const sheet = screen.getByRole('dialog', { name: s.filtersTitle });
    fireEvent.change(within(sheet).getByRole('combobox', { name: s.program }), { target: { value: 'arabic' } });
    expect(onChange).toHaveBeenCalledWith({ teacher: 'none', weekly: 'no', program: 'arabic' });
    fireEvent.click(within(sheet).getByRole('button', { name: s.showResults }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
