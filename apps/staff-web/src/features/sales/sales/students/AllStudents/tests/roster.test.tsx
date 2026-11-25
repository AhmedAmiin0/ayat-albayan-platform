import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { student } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { AllStudents } from '@/features/sales/sales/students/AllStudents/AllStudents';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
// The viewer's zone: the browser's, pinned here so the test reads the same everywhere.
vi.mock('@ab/web-kit/lib/clock-text', async (orig) => ({ ...(await orig<object>()), viewerZone: () => 'Asia/Riyadh' }));

afterEach(() => apiFetch.mockReset());

const asma = { display_name_ar: 'أسماء حسين', display_name_en: null };
const weekly = [{ next: ['2026-11-01T08:00:00.000Z', '2026-11-03T08:00:00.000Z'], teacher: asma }];

describe('AllStudents: every student\'s schedule and attendance (owner 2026-10-30)', () => {
  it('a row of another assistant\'s student and one of hers: both lines, in one list read', async () => {
    apiFetch.mockResolvedValue({
      items: [
        student({ weekly, attendance: { attended: 7, held: 9, basis: 'subscription' } }),
        student({ id: 's2', name: 'يوسف', mine: true, weekly: [], attendance: { attended: 0, held: 0, basis: 'recent' } }),
      ],
      total: 2, page: 1, pageSize: 25,
    });
    renderWithQuery(<AllStudents />);
    expect(await screen.findByText(/^الأحد، الثلاثاء · 11:00( ص)? · أسماء حسين$/)).toBeTruthy();
    expect(screen.getByText('حضر 7 من 9 في الباقة الحالية')).toBeTruthy();
    expect(screen.getByText(t.sales.allStudents.noSchedule)).toBeTruthy();
    expect(screen.getByText(t.sales.allStudents.noHeldRecent)).toBeTruthy();
    expect(screen.getAllByText(t.sales.allStudents.schedule).length).toBeGreaterThan(0);
    // The roster comes in the one list read; each row's chat seat is read on its own (docs/31 §2).
    const reads = apiFetch.mock.calls.filter(([path]) => !String(path).endsWith('/channel/seat'));
    expect(reads).toHaveLength(1);
  });

  it('an old cache without the fields: empty cells, the rest as before', async () => {
    apiFetch.mockResolvedValue({ items: [student()], total: 1, page: 1, pageSize: 25 });
    renderWithQuery(<AllStudents />);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.queryByText(t.sales.allStudents.noSchedule)).toBeNull();
  });
});
