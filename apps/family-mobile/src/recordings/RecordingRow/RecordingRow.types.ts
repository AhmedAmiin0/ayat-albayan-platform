import type { PortalRecording, PortalStudent } from '@ab/shared';

export interface RecordingRowProps {
  row: PortalRecording;
  student: PortalStudent;
  /** How many parts the lesson was recorded in (1 for most). */
  parts: number;
}
