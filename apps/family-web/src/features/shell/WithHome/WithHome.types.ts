import type { PortalHome } from '@ab/shared';
import type { ReactNode } from 'react';

export interface WithHomeProps {
  children: (home: PortalHome) => ReactNode;
}
