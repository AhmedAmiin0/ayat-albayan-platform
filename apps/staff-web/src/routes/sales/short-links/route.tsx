import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { firstSalesRoute } from '@/features/sales/sales';

/** /sales/short-links/*: short_links.manage, else the first page the held role opens. */
export const Route = createFileRoute('/sales/short-links')({ component: SalesShortLinksGate });

type Gate = 'loading' | 'on' | 'off';

const gateOf = (loaded: boolean, allowed: boolean): Gate => {
  if (!loaded) return 'loading';
  return allowed ? 'on' : 'off';
};

function SalesShortLinksGate() {
  const { can, loaded } = usePermissions();
  const view: Record<Gate, ReactNode> = {
    loading: <ListSkeleton />,
    on: <Outlet />,
    off: <Navigate to={firstSalesRoute(can)} replace />,
  };
  return view[gateOf(loaded, can('short_links.manage'))];
}
