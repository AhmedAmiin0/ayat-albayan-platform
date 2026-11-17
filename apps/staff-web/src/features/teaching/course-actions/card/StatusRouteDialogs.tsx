import { useQuery } from '@tanstack/react-query';
import { CoursePauseSheet } from '@/features/teaching/course-pause';
import { StopCourseDialog } from '@/features/teaching/course-actions/StopCourseDialog';
import { courseCardQuery } from './api';

export type StatusAsk = 'pause' | 'stop' | null;

interface StatusRouteDialogsProps {
  studentId: string;
  ask: StatusAsk;
  onClose: () => void;
  /** Done: the form says what changed. */
  onDone: (message: string) => void;
}

/**
 * The status field's dialogs (owner 2026-11-17): «موقوف مؤقتًا» opens «إيقاف الدورة مؤقتًا» and
 * «متوقف» opens «إلغاء الاشتراك» of the current package (the card's), never a bare status change.
 */
export function StatusRouteDialogs({ studentId, ask, onClose, onDone }: StatusRouteDialogsProps) {
  const card = useQuery({ ...courseCardQuery({ studentId, tree: 'admin' }), enabled: ask === 'stop' });
  const subscriptionId = card.data?.subscriptionId ?? null;
  const shared = { studentId, onClose, onDone };
  if (ask === 'pause') return <CoursePauseSheet {...shared} />;
  if (ask !== 'stop' || subscriptionId === null) return null;
  return <StopCourseDialog {...shared} subscriptionId={subscriptionId} />;
}
