import { createFileRoute } from '@tanstack/react-router';
import { requireRole, useClock, useViewerTz } from '@ab/web-kit';
import { StaffClassroomPage } from '@/features/teaching/classroom/join/StaffClassroomPage';
import { joinMeeting } from '@/features/teaching/meetings/internal/internal-api';
import { meetingJoinProblem } from '@/features/teaching/meetings/rows/meeting-join-errors';

/** Internal meeting room for any staff login; refusals use meeting wording (meetingJoinProblem). */
export const Route = createFileRoute('/meeting/$id')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, ['admin', 'teacher', 'assistant', 'sales']),
  component: MeetingRoute,
});

function MeetingRoute() {
  const clock = { ...useClock(), tz: useViewerTz() };
  const { id } = Route.useParams();
  return (
    <StaffClassroomPage
      lessonId={id}
      join={joinMeeting}
      problem={(e) => meetingJoinProblem(e, clock, clock.tz)}
    />
  );
}
