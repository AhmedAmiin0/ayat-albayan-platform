import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { TeacherNav } from './TeacherNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('TeacherNav on a phone', () => {
  it('is a fixed bottom bar of six equal tabs (56px) that turns into the top row from sm up', () => {
    render(<TeacherNav />);
    const nav = screen.getByRole('navigation', { name: t.teacherNav.label });
    expect(nav.className).toMatch(/fixed .*bottom-0/);
    expect(nav.className).toContain('sm:static');
    expect(nav.querySelector('ul')?.className).toContain('grid-cols-6');
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-14');
  });
});
