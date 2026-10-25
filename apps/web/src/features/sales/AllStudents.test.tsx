import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { student } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { AllStudents } from './AllStudents';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => apiFetch.mockReset());

describe('AllStudents «كل الطلاب»', () => {
  it('lists code, name, teacher, program, status and guardian; no money column', async () => {
    apiFetch.mockResolvedValue({ items: [student(), student({ id: 's2', name: 'يوسف', code: 'AB-0190', teacher_name: null })], total: 2, page: 1, pageSize: 25 });
    renderWithQuery(<AllStudents />);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/students/all?page=1&pageSize=25');
    for (const text of ['AB-0183', 'أبرار', 'أم سهيلة', t.enums.program.quran, t.enums.studentStatus.active, t.sales.allStudents.noTeacher]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(document.body.textContent).not.toMatch(/ر\.س|SAR|\$/);
  });

  it('searches on the server from page 1', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    renderWithQuery(<AllStudents />);
    fireEvent.change(screen.getByRole('searchbox', { name: t.sales.allStudents.search }), { target: { value: 'سه' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith(`/sales/students/all?page=1&pageSize=25&search=${encodeURIComponent('سه')}`));
    expect(await screen.findByText(t.sales.allStudents.empty)).toBeTruthy();
  });
});
