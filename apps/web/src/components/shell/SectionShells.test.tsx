import { USER_ROLES } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell, AssistantShell, PortalShell, SalesShell, SHELL_OF, TeacherShell } from './SectionShells';

vi.mock('@/components/AppShell', () => ({ AppShell: () => null }));

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
