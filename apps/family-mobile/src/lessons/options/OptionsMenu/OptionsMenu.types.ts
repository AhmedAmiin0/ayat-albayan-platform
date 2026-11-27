import type { LessonOption } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';

export interface OptionsTitle {
  heading: string;
  subline: string;
  decline: string;
}

export interface OptionsMenuProps {
  lesson: PortalLesson;
  title: OptionsTitle;
  now: Date;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPick: (option: Exclude<LessonOption, 'decline'>) => void;
  onDecline: (reason: string) => void;
}
