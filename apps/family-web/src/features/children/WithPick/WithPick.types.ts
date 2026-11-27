import type { PortalHome, PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';

export type Page = (student: PortalStudent, home: PortalHome) => ReactNode;

export interface WithPickProps {
  children: Page;
}
