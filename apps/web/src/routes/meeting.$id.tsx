import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/features/auth/me';
import { StaffClassroomPage } from '@/features/classroom/StaffClassroomPage';
import { joinMeeting } from '@/features/meetings/internal-api';

/** /meeting/:id: an internal meeting's room («اجتماع داخلي») for any staff login, the classroom room UI with the meeting's join. */
export const Route = createFileRoute('/meeting/$id')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['admin', 'teacher', 'assistant', 'sales']),
  component: MeetingRoute,
});

function MeetingRoute() {
  const { id } = Route.useParams();
  return <StaffClassroomPage lessonId={id} join={joinMeeting} />;
}
