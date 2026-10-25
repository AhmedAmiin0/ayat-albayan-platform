import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/features/auth/me';
import { StaffClassroomPage } from '@/features/classroom/join/StaffClassroomPage';
import { joinMeeting } from '@/features/meetings/internal/internal-api';
import { meetingJoinProblem } from '@/features/meetings/rows/meeting-join-errors';

/**
 * /meeting/:id: an internal meeting's room («اجتماع داخلي») for any staff login, the classroom room UI
 * with the meeting's join; a refusal reads in a meeting's words (meetingJoinProblem).
 */
export const Route = createFileRoute('/meeting/$id')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['admin', 'teacher', 'assistant', 'sales']),
  component: MeetingRoute,
});

function MeetingRoute() {
  const { id } = Route.useParams();
  return <StaffClassroomPage lessonId={id} join={joinMeeting} problem={(e) => meetingJoinProblem(e)} />;
}
