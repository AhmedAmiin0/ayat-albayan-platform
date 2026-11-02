import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/people/auth';
import { currentCourseQuery, type CurrentVia } from './api';
import { CourseActions } from './CourseActions';

interface ProfileCourseActionsProps {
  studentId: string;
  onDone: (message: string) => void;
}

/** The first route the viewer holds that resolves the current package; null = none held. */
function viaOf(
  can: (key: 'subscriptions.stop' | 'courses.reschedule' | 'students.change_teacher') => boolean,
): CurrentVia | null {
  if (can('subscriptions.stop')) return 'stop';
  if (can('courses.reschedule')) return 'times';
  return can('students.change_teacher') ? 'teacher' : null;
}

/**
 * The admin student file's course actions on the current package, resolved by the server
 * (the newest live one); hidden without a key or without a package to act on (404).
 */
export function ProfileCourseActions({ studentId, onDone }: ProfileCourseActionsProps) {
  const { can } = usePermissions();
  const via = viaOf(can);
  const current = useQuery({
    ...currentCourseQuery(studentId, via ?? 'stop'),
    enabled: via !== null,
  });
  if (via === null || !current.data) return null;
  return (
    <CourseActions
      studentId={studentId}
      subscriptionId={current.data}
      mode="admin"
      onDone={onDone}
    />
  );
}
