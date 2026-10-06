import type { Permission } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { pagePermission } from '@/features/auth/admin-access';
import { t } from '@/lib/i18n';
import { AdminNav, visibleGroups } from './AdminNav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const only = (...held: Permission[]) => (p: Permission) => held.includes(p);

describe('AdminNav — dynamic roles', () => {
  it('shows only the items whose permission the user holds («محاسب»: المدفوعات, not الطلاب)', () => {
    render(<AdminNav can={only('payments.read')} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: t.payments.title })).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.nav.students })).toBeNull();
  });

  it('drops groups left empty and keeps the order of the rest', () => {
    const groups = visibleGroups(only('students.read', 'expenses.read', 'roles.manage'));
    expect(groups.map((g) => g.map((i) => i.key))).toEqual([['students'], ['expenses'], ['roles']]);
  });

  it('shows everything to the system admin (default)', () => {
    expect(visibleGroups(() => true).flat()).toHaveLength(22);
  });

  it('gives every item the same permission the /admin route guard checks for its page', () => {
    for (const item of visibleGroups(() => true).flat()) expect([item.to, item.permission]).toEqual([item.to, pagePermission(item.to)]);
  });
});
