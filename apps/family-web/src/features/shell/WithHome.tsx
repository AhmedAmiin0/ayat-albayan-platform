import type { PortalHome } from '@ab/shared';
import type { ReactNode } from 'react';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { usePortalHome } from './use-portal-home';

/** A page that needs GET /portal/me (the login's kind and students): its skeleton until then. */
export function WithHome({ children }: { children: (home: PortalHome) => ReactNode }) {
  return <QueryState query={usePortalHome()}>{children}</QueryState>;
}
