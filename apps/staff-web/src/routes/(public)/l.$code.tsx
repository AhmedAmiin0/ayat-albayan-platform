import { createFileRoute } from '@tanstack/react-router';
import { GatePage } from '@/features/platform/short-links-gate';

/**
 * /l/:code: the web gate of a managed short link (docs/19 «Gate flow»). Outside every guard: no
 * login, no app shell, and never the family-host move (only /portal and /account make it).
 */
export const Route = createFileRoute('/(public)/l/$code')({ component: GateRoute });

function GateRoute() {
  const { code } = Route.useParams();
  return <GatePage code={code} />;
}
