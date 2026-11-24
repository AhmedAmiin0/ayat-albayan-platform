import { CoursePauseSheet } from '@/features/teaching/course-pause';
import { StopCourseDialog } from '@/features/teaching/course-actions/StopCourseDialog';
import type { StatusAsk } from './use-status-pick';

interface StatusRouteDialogsProps {
  studentId: string;
  ask: StatusAsk;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
  onClose: () => void;
  /** Done: the form says what changed. */
  onDone: (message: string) => void;
}

/** Paused opens the pause, stopped opens the current package's cancel; never a bare change. */
export function StatusRouteDialogs({ ask, chatPhone, ...shared }: StatusRouteDialogsProps) {
  if (ask?.route === 'pause') return <CoursePauseSheet {...shared} />;
  if (ask?.route !== 'stop') return null;
  const chat = chatPhone ? { phone: chatPhone, mode: 'admin' as const } : undefined;
  return <StopCourseDialog {...shared} subscriptionId={ask.subscriptionId} chat={chat} />;
}
