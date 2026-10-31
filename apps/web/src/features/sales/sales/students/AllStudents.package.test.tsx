import type { SalesPackageSummary } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { student } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { AllStudents } from './AllStudents';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/clock-text', async (orig) => ({ ...(await orig<object>()), viewerZone: () => 'Asia/Riyadh' }));

afterEach(() => apiFetch.mockReset());

const summary: SalesPackageSummary = {
  id: 'sub9', package: '12', status: 'paused', starts_on: '2026-10-01', renews_on: null,
  ended_at: null, projected_end_at: '2026-11-20T08:00:00.000Z', created_at: '2026-09-30T10:00:00Z',
  lessons_total: 12, lessons_used: 5, lessons_remaining: 7,
};
const S = t.sales.allStudents;

// Owner 2026-10-30: «Why i cant see the subscription lessoons and ststus of this user».
describe('AllStudents: every student\'s status chip and current package', () => {
  it('another assistant\'s student and one of hers: the chip and the package line, no price', async () => {
    apiFetch.mockResolvedValue({
      items: [student({ package: summary }), student({ id: 's2', name: 'يوسف', mine: true, package: null })],
      total: 2, page: 1, pageSize: 25,
    });
    const { container } = renderWithQuery(<AllStudents />);
    const line = await screen.findByText((text) => text.startsWith(`${t.enums.packageSize['12']} · `));
    expect(line.textContent).toContain(t.enums.subscriptionStatus.paused);
    expect(line.textContent).toContain('استُخدمت 5 من 12 · المتبقي: 7');
    expect(line.textContent).toContain('النهاية المتوقعة: ⁦2026-11-20⁩');
    expect(screen.getByText(S.noPackage)).toBeTruthy();
    expect(container.querySelectorAll('[data-tone]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(t.enums.studentStatus.active).length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toMatch(/ر\.س|SAR/);
  });

  it('an old cache without the field: an empty package cell', async () => {
    apiFetch.mockResolvedValue({ items: [student()], total: 1, page: 1, pageSize: 25 });
    renderWithQuery(<AllStudents />);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.queryByText(S.noPackage)).toBeNull();
  });
});
