import { QueryState } from '@ab/web-kit';
import type { WithHomeProps } from './WithHome.types';
import { useWithHome } from './use-with-home';

/** A page that needs GET /portal/me (the login's kind and students): its skeleton until then. */
export function WithHome({ children }: WithHomeProps) {
  const { portalHome } = useWithHome();
  return <QueryState query={portalHome}>{children}</QueryState>;
}
