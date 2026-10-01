import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminNav } from './AdminNav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

describe('AdminNav', () => {
  it.each([
    [t.nav.students, '/admin/students'],
    [t.nav.teachers, '/admin/teachers'],
    [t.nav.leads, '/admin/leads'],
  ])('links %s to %s', (label, href) => {
    render(<AdminNav />);
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
  });
});
