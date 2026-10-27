import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/features/people/auth/me';
import { StaffClassroomPage } from '@/features/teaching/classroom/join/StaffClassroomPage';
import { joinMeeting } from '@/features/teaching/meetings/internal/internal-api';
import { meetingJoinProblem } from '@/features/teaching/meetings/rows/meeting-join-errors';
import { useClock } from '@/lib/clock';

/**
 * /meeting/:id: an internal meeting's room («اجتماع داخلي») for any staff login, the classroom room UI
 * with the meeting's join; a refusal reads in a meeting's words (meetingJoinProblem).
 */
export const Route = createFileRoute('/meeting/$id')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['admin', 'teacher', 'assistant', 'sales']),
  component: MeetingRoute,
});

function MeetingRoute() {
  const clock = useClock();
  const { id } = Route.useParams();
  return <StaffClassroomPage lessonId={id} join={joinMeeting} problem={(e) => meetingJoinProblem(e, clock)} />;
}
