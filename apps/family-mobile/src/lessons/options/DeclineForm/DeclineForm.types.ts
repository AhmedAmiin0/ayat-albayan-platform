import type { PortalLesson } from '@ab/shared';

export interface DeclineFormProps {
  lesson: PortalLesson;
  title: string;
  busy: boolean;
  onDecline: (reason: string) => void;
  onBack: () => void;
}
