import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TeacherNav } from './TeacherNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

describe('TeacherNav layout (owner, 2026-10-05: one compact bar on phones)', () => {
  it('no fixed bottom bar: a vertical list (the «القائمة» sheet) that becomes a row from 900px', () => {
    render(<TeacherNav />);
    const nav = screen.getByRole('navigation', { name: t.teacherNav.label });
    expect(nav.className).not.toMatch(/fixed/);
    const list = nav.querySelector('ul')?.className ?? '';
    expect(list).toContain('flex-col');
    expect(list).toContain('shell:flex-row');
  });

  it('every link, «كشوف الشهر» included, is a 44px tap target with its whole word', () => {
    render(<TeacherNav />);
    expect(screen.getAllByRole('link')).toHaveLength(8);
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-11');
    expect(screen.getByText(t.teacherNav.payouts).className).not.toContain('truncate');
  });
});
