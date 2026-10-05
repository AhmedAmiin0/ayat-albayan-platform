import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { TeacherNav } from './TeacherNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('TeacherNav on a phone', () => {
  it('is a fixed bottom bar of seven equal tabs (56px) that turns into the top row from sm up', () => {
    render(<TeacherNav />);
    const nav = screen.getByRole('navigation', { name: t.teacherNav.label });
    expect(nav.className).toMatch(/fixed .*bottom-0/);
    expect(nav.className).toContain('sm:static');
    expect(nav.querySelector('ul')?.className).toContain('grid-cols-7');
    expect(screen.getAllByRole('link')).toHaveLength(7);
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-14');
  });

  it('never cuts a tab word with an ellipsis at 360–390px: it wraps to two short lines instead', () => {
    render(<TeacherNav />);
    const label = screen.getByText(t.teacherNav.payouts);
    expect(label.className).not.toContain('truncate');
    expect(label.className).toContain('line-clamp-2');
  });
});
