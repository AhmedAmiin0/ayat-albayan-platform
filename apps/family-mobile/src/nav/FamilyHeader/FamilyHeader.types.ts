import type { PortalStudent } from '@ab/shared';

export interface FamilyHeaderProps {
  title: string;
  /** A line under the title. */
  subtitle?: string;
  /** A pushed screen shows back and no bell; a tab screen shows the bell. */
  back?: boolean;
  /** A tab of a guardian of several: the child in view under the title, a switch. */
  child?: PortalStudent | null;
}
