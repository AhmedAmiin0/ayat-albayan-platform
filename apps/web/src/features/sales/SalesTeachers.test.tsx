import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { teacher } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { SalesTeachers } from './SalesTeachers';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => apiFetch.mockReset());

describe('SalesTeachers «المعلمون»', () => {
  it('shows each teacher with gender, programs and their students (name and code)', async () => {
    apiFetch.mockResolvedValue([teacher(), teacher({ id: 'tc2', name: 'محمد', gender: 'male', programs: ['islamic_studies'], students: [] })]);
    renderWithQuery(<SalesTeachers />);
    expect(await screen.findByText('أبرار')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/teachers');
    expect(screen.getByText(`${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`)).toBeTruthy();
    expect(screen.getByText('سهيلة')).toBeTruthy();
    expect(screen.getByText('AB-0183')).toBeTruthy();
    expect(screen.getByText(t.enums.gender.male)).toBeTruthy();
    expect(screen.getByText(t.sales.teachers.noStudents)).toBeTruthy();
  });

  it('the empty state when there is no active teacher', async () => {
    apiFetch.mockResolvedValue([]);
    renderWithQuery(<SalesTeachers />);
    expect(await screen.findByText(t.sales.teachers.empty)).toBeTruthy();
  });
});
