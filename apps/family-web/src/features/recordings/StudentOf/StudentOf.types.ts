import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';

export interface Props {
  studentId: string;
  children: (student: PortalStudent) => ReactNode;
}
