import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@ab/web-kit';
import { StaffClassroomPage } from '@/features/teaching/classroom/join/StaffClassroomPage';

/** /classroom/:lessonId: the online room for admin, sales, the teacher and the assistant. */
export const Route = createFileRoute('/classroom/$lessonId')({
  beforeLoad: ({ context }) =>
    requireRole(context.queryClient, ['admin', 'teacher', 'assistant', 'sales']),
  component: ClassroomRoute,
});

function ClassroomRoute() {
  const { lessonId } = Route.useParams();
  return <StaffClassroomPage lessonId={lessonId} />;
}
