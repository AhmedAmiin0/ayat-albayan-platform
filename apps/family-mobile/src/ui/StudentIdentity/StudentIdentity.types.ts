import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';

export interface StudentIdentityProps {
  student: PortalStudent;
  /** A line under the code (the last report). */
  children?: ReactNode;
  name?: string;
}
