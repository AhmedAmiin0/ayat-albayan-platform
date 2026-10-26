import { createFileRoute } from '@tanstack/react-router';
import { meetingPathOfLink } from '@/features/teaching/classroom/join/staff-link';
import { StaffLinkGate } from '@/features/teaching/classroom/join/StaffLinkGate';
import { MeetingGuestPage } from '@/features/teaching/meetings/MeetingGuestPage';

/**
 * /m/:token: an internal meeting's link («اجتماع داخلي»). Outside every guard: no login, no app
 * shell. A signed-in staff member is sent to /meeting/<id> to join with their own role.
 */
export const Route = createFileRoute('/m/$token')({ component: MeetingLinkRoute });

function MeetingLinkRoute() {
  const { token } = Route.useParams();
  return (
    <StaffLinkGate linkKey={token} resolve={() => meetingPathOfLink(token)}>
      <MeetingGuestPage token={token} />
    </StaffLinkGate>
  );
}
