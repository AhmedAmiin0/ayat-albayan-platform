import type { CodeRoutes } from '@ab/client-core';
import type { ReactNode } from 'react';

export interface Props {
  /** The family's routes or the teacher's (docs/46 A6): the same steps and answers. */
  codes: CodeRoutes;
  /** The words for «codes cannot be sent now» on this tab (the teacher's are not the family's). */
  unavailable?: string;
  /** Links under the phone. */
  children?: ReactNode;
}
