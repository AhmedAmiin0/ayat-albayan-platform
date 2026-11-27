import type { PortalStudent } from '@ab/shared';

export interface WhoProps {
  title: string;
  over: string;
  student?: PortalStudent;
  /** A chevron after the name: the block is the child switch. */
  switches: boolean;
}
