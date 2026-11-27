import type { PortalLesson, PortalStudent } from '@ab/shared';

export interface AskTimeBodyProps {
  lesson: PortalLesson;
  student: PortalStudent;
  busy: boolean;
  error: string | null;
  onSend: (ask: { startsAt: string; note: string }) => void;
}
