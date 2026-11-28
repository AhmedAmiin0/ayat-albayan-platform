import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { SettingsHub } from '@/features/platform/settings/hub/SettingsHub';

/** /admin/settings: the hub (docs/26b §1), and the parent of its five pages (via Outlet). */
export const Route = createFileRoute('/admin/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  const children = useChildMatches();
  if (children.length > 0) return <Outlet />;
  return <SettingsHub />;
}
