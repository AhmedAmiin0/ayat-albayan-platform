import type { PortalStudent } from '@ab/shared';

export interface GreetingHeaderProps {
  title: string;
  over?: string;
  /** The home of the student in view shows their avatar instead of the academy's mark. */
  student?: PortalStudent;
}
