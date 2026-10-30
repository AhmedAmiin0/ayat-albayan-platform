import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminShell, SalesShell, TeacherShell } from './SectionShells';

type Shell = { nav?: ReactNode; topNav?: ReactNode };
const inboxRealtime = vi.hoisted(() => vi.fn<(enabled: boolean) => void>());
const appShell = vi.hoisted(() => vi.fn((props: Shell) => <div>{props.nav ?? props.topNav}</div>));
const perms = vi.hoisted(() => ({ loaded: false }));
vi.mock('@/components/shell/layout/AppShell', () => ({ AppShell: appShell }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ loaded: perms.loaded, permissions: [], can: () => perms.loaded }),
}));
vi.mock('@/components/shell/nav/AdminNav', () => ({ AdminNav: () => <nav>admin-nav</nav> }));
vi.mock('@/features/teaching/teacher/TeacherNav', () => ({ TEACHER_NAV_ITEMS: [], TeacherNav: () => <nav>teacher-nav</nav> }));
vi.mock('@/features/sales/sales/SalesNav', () => ({ SALES_NAV_ITEMS: [], SalesNav: () => <nav>sales-nav</nav> }));
vi.mock('@/features/sales/sales/use-sales-unread', () => ({ useSalesUnread: () => 0 }));
vi.mock('./use-nav-counts', () => ({ useNavCounts: () => ({}) }));
// The calls provider (docs/28) reads the inbox API; these tests are about the nav only.
vi.mock('@/features/messaging/inbox', () => ({
  CallProvider: ({ children }: { children: ReactNode }) => children,
  useInboxRealtime: inboxRealtime,
}));

// docs/27 E2 (owner D6): never a partial menu while /auth/me loads, a skeleton in its place.
describe('the navigation while /auth/me loads', () => {
  beforeEach(() => {
    perms.loaded = false;
  });

  it.each([
    ['admin', AdminShell, 'admin-nav'],
    ['teacher', TeacherShell, 'teacher-nav'],
    ['sales', SalesShell, 'sales-nav'],
  ] as const)('%s: a skeleton until loaded, then the whole menu', (_, Shell, menu) => {
    const view = render(<Shell />);
    expect(screen.getByTestId('nav-skeleton').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText(menu)).toBeNull();
    perms.loaded = true;
    view.rerender(<Shell />);
    expect(screen.getByText(menu)).toBeTruthy();
    expect(screen.queryByTestId('nav-skeleton')).toBeNull();
  });
});
