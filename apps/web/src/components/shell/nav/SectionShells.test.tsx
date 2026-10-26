import { USER_ROLES } from '@ab/shared';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell, AssistantShell, PortalShell, SalesShell, SHELL_OF, TeacherShell } from './SectionShells';

const appShell = vi.hoisted(() => vi.fn<(props: { wide?: boolean }) => null>(() => null));
vi.mock('@/components/AppShell', () => ({ AppShell: appShell }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@/features/sales/sales/use-sales-unread', () => ({ useSalesUnread: () => 0 }));

// R-ACC-01: /account opens inside the shell each base role normally gets.
describe('SHELL_OF', () => {
  it('maps every base role to its own shell', () => {
    expect(Object.keys(SHELL_OF).sort()).toEqual([...USER_ROLES].sort());
    expect(SHELL_OF).toEqual({
      admin: AdminShell,
      teacher: TeacherShell,
      sales: SalesShell,
      assistant: AssistantShell,
      guardian: PortalShell,
      student: PortalShell,
    });
  });
});

describe('the wide frame (owner 2026-10-20)', () => {
  it('the assistant (sales) shell gives every page the chat\'s full width; the teacher\'s keeps the cap', () => {
    render(<SalesShell />);
    expect(appShell.mock.lastCall?.[0].wide).toBe(true);
    render(<TeacherShell />);
    expect(appShell.mock.lastCall?.[0].wide).toBeFalsy();
  });
});
