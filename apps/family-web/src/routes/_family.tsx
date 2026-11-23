import { createFileRoute, Outlet } from '@tanstack/react-router';
import { FamilyShell, requireFamily, WrongApp, type Visitor } from '#/features/shell/index.ts';

/** Every family page under the shell; a staff login sees «wrongApp» (signed out by the guard). */
const LAYOUT: Readonly<Record<Visitor, () => React.ReactNode>> = {
  family: () => (
    <FamilyShell>
      <Outlet />
    </FamilyShell>
  ),
  staff: () => <WrongApp />,
};

export const Route = createFileRoute('/_family')({
  beforeLoad: async ({ context, location }) => ({
    visitor: await requireFamily(context.queryClient, location.href),
  }),
  component: FamilyLayout,
});

function FamilyLayout() {
  const { visitor } = Route.useRouteContext();
  return <>{LAYOUT[visitor]()}</>;
}
