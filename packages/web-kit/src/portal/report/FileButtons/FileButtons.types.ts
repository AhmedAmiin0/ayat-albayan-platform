import type { PortalFileKind } from '@ab/client-core';

export interface PortalFile {
  kind: PortalFileKind;
  id: string;
}

export interface Props {
  studentId: string;
  files: PortalFile[];
  /** Each button with its icon (the report page); bare words in a file list. */
  icons?: boolean;
}
