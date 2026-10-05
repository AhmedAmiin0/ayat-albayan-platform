import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { StudentsFilters } from './filters';
import { StudentFilters, studentFilterOptions } from './StudentFilters';
import { studentFilterChips } from './use-student-filters';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const T = '11111111-1111-4111-8111-111111111111';
const s = t.students;

function renderFields(value: StudentsFilters = {}) {
  apiFetch.mockResolvedValue([{ id: T, display_name_ar: 'أبرار', meeting_link: null }]);
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentFilters value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('StudentFilters (R-STU-01, the «تصفية» panel fields)', () => {
  it('status chips add to the comma-joined status', () => {
    const onChange = renderFields({ status: 'trial' });
    expect(screen.getByRole('checkbox', { name: t.enums.studentStatus.trial })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('checkbox', { name: t.enums.studentStatus.active }));
    expect(onChange).toHaveBeenCalledWith({ status: 'trial,active' });
  });

  it('teacher select lists «بدون معلم» and the teachers', async () => {
    const onChange = renderFields({ program: 'quran' });
    const select = screen.getByRole('combobox', { name: s.teacher });
    await within(select).findByRole('option', { name: 'أبرار' });
    fireEvent.change(select, { target: { value: 'none' } });
    expect(onChange).toHaveBeenCalledWith({ program: 'quran', teacher: 'none' });
    fireEvent.change(select, { target: { value: T } });
    expect(onChange).toHaveBeenLastCalledWith({ program: 'quran', teacher: T });
    expect(within(select).getByRole('option', { name: s.teacherNone })).toBeTruthy();
  });

  it('package and weekly selects; «الكل» removes the filter', () => {
    const onChange = renderFields({ weekly: 'yes' });
    fireEvent.change(screen.getByRole('combobox', { name: s.package }), { target: { value: 'low' } });
    expect(onChange).toHaveBeenCalledWith({ weekly: 'yes', package: 'low' });
    fireEvent.change(screen.getByRole('combobox', { name: s.weeklyFilter }), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('chips: one per checked status, then each set select by its option label; removing one drops only it', () => {
    const onChange = vi.fn();
    const value: StudentsFilters = { status: 'trial,paused', teacher: T, program: 'quran' };
    const chips = studentFilterChips(value, studentFilterOptions([{ id: T, display_name_ar: 'أبرار' }]), onChange);
    expect(chips.map((c) => `${c.label}: ${c.value}`)).toEqual([
      `${s.status}: ${t.enums.studentStatus.trial}`,
      `${s.status}: ${t.enums.studentStatus.paused}`,
      `${s.teacher}: أبرار`,
      `${s.program}: ${t.enums.program.quran}`,
    ]);
    chips[0]?.onRemove();
    expect(onChange).toHaveBeenLastCalledWith({ status: 'paused', teacher: T, program: 'quran' });
    chips[2]?.onRemove();
    expect(onChange).toHaveBeenLastCalledWith({ status: 'trial,paused', program: 'quran' });
  });
});
