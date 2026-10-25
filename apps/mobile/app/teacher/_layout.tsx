import { usePushRegistration } from '@/core/push/usePushRegistration';
import { TeacherTabs } from '@/teacher/TeacherTabs';

/** The teacher tree: her tabs, and this device registered for her pushes (R-MOB-01, R-NOT-01). */
export default function TeacherLayout() {
  usePushRegistration('teacher');
  return <TeacherTabs />;
}
