import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminHome } from './AdminHome';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe('AdminHome (/admin)', () => {
  it('is never a blank page: the cartouche, one sentence and one way on to the inbox', () => {
    render(<AdminHome />);
    expect(screen.getByRole('heading', { level: 1, name: t.admin.dashboardTitle })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: t.admin.homeEmpty })).toBeTruthy();
    expect(screen.getByText(t.admin.homeHint)).toBeTruthy();
    const link = screen.getByRole('link', { name: t.admin.openLeads });
    expect(link.getAttribute('href')).toBe('/admin/leads');
    expect(link.className).toContain('bg-primary'); // the screen's one primary
  });
});
