import type { Permission } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TeacherNav } from '@/features/teacher/TeacherNav';
import { t } from '@/lib/i18n';
import { SalesNav } from './SalesNav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const without = (missing: Permission) => (p: Permission) => p !== missing;

describe('SalesNav / TeacherNav — dynamic roles', () => {
  it('hides the chats tab when the role lost inbox.read', () => {
    render(<SalesNav can={without('inbox.read')} />);
    expect(screen.queryByRole('link', { name: t.sales.nav.chats })).toBeNull();
    expect(screen.getByRole('link', { name: t.sales.nav.subscriptions })).toBeTruthy();
  });

  it('«أرباحي» follows self.sales_earnings; subscriptions follow self.sales', () => {
    render(<SalesNav can={without('self.sales_earnings')} />);
    expect(screen.queryByRole('link', { name: t.assistantPortal.nav.earnings })).toBeNull();
    expect(screen.getByRole('link', { name: t.sales.nav.subscriptions })).toBeTruthy();
  });

  it('the assistant side (students, teachers, running lessons) follows self.sales_academy', () => {
    render(<SalesNav can={without('self.sales_academy')} />);
    for (const label of [t.sales.nav.allStudents, t.sales.nav.teachers, t.sales.nav.live]) expect(screen.queryByRole('link', { name: label })).toBeNull();
    expect(screen.getByRole('link', { name: t.sales.nav.subscriptions })).toBeTruthy();
  });

  it('keeps the teacher’s own pages and drops only what is not granted', () => {
    render(<TeacherNav can={without('inbox.read')} />);
    expect(screen.queryByRole('link', { name: t.teacherNav.chats })).toBeNull();
    expect(screen.getByRole('link', { name: t.teacherNav.reports })).toBeTruthy();
  });
});
