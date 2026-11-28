import { formatPhone } from '@ab/core';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { student } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { AllStudents } from '@/features/sales/sales/students/AllStudents/AllStudents';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

afterEach(() => mockApi.reset('read'));

describe('AllStudents «كل الطلاب»', () => {
  it('lists code, name, teacher, program, status, guardian and phone; no money column', async () => {
    mockApi.onRead(() => ({
      items: [
        student(),
        student({
          id: 's2',
          name: 'يوسف',
          code: 'AB-0190',
          teacher_name: null,
          guardian_phone: null,
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 25,
    }));
    renderWithQuery(<AllStudents />);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: '/sales/students/all?page=1&pageSize=25',
    });
    for (const text of [
      'AB-0183',
      'أبرار',
      'أم سهيلة',
      t.enums.program.quran,
      t.enums.studentStatus.active,
      t.sales.allStudents.noTeacher,
    ]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(formatPhone('+201001112223'))).toHaveLength(1);
    expect(screen.getAllByText(t.sales.allStudents.guardianPhone).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/ر\.س|SAR|\$/);
  });

  it('searches on the server from page 1', async () => {
    mockApi.onRead(() => ({ items: [], total: 0, page: 1, pageSize: 25 }));
    renderWithQuery(<AllStudents />);
    fireEvent.change(screen.getByRole('searchbox', { name: t.sales.allStudents.search }), {
      target: { value: 'سه' },
    });
    await vi.waitFor(() =>
      expect(mockApi.reads().at(-1)).toEqual({
        method: 'GET',
        path: `/sales/students/all?page=1&pageSize=25&search=${encodeURIComponent('سه')}`,
      }),
    );
    expect(await screen.findByText(t.sales.allStudents.empty)).toBeTruthy();
  });
});
