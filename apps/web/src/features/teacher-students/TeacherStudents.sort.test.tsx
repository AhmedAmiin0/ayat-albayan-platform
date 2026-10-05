import type { TeacherStudentView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FILTER_DEBOUNCE_MS } from '@/components/ColumnFilterText';
import { t } from '@/lib/i18n';
import { TeacherStudents } from './TeacherStudents';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const s = (over: Partial<TeacherStudentView>): TeacherStudentView => ({
  ...{ id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', program: 'quran', level: null, age: 9 },
  ...{ next_lesson_at: null },
  ...over,
});
const ROWS = [s({}), s({ id: 's2', name: 'أحمد', code: 'AB-0190', program: 'arabic', age: 12 })];

async function open() {
  apiFetch.mockResolvedValue(ROWS);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherStudents />
    </QueryClientProvider>,
  );
  await screen.findByText('سهيلة');
}

const names = () => screen.getAllByRole('link').map((a) => a.textContent);
const label = (col: string) => t.table.filterBy.replace('{col}', col);

describe('TeacherStudents sort + filters (R-TCH-03, R-NFR-08)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    vi.useRealTimers();
  });

  it('every column sorts the loaded list', async () => {
    await open();
    expect(screen.getAllByRole('columnheader').filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: t.teacherStudents.ageCol }));
    expect(names()).toEqual(['سهيلة', 'أحمد']);
    fireEvent.click(screen.getByRole('button', { name: t.teacherStudents.ageCol }));
    expect(names()).toEqual(['أحمد', 'سهيلة']);
  });

  it('the program select and the name box filter the rows', async () => {
    await open();
    fireEvent.change(screen.getByRole('combobox', { name: label(t.students.program) }), {
      target: { value: t.enums.program.arabic },
    });
    expect(names()).toEqual(['أحمد']);
    fireEvent.change(screen.getByRole('combobox', { name: label(t.students.program) }), { target: { value: '' } });
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('searchbox', { name: label(t.students.name) }), { target: { value: 'سهيله' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(names()).toEqual(['سهيلة']);
  });
});
