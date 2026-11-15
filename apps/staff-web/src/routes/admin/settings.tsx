import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { SettingsHub } from '@/features/platform/settings/hub/SettingsHub';

/** /admin/settings — the hub (docs/26b §1); also the parent of its five pages (rendered via Outlet). */
export const Route = createFileRoute('/admin/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  const children = useChildMatches();
  if (children.length > 0) return <Outlet />;
  return <SettingsHub />;
}
