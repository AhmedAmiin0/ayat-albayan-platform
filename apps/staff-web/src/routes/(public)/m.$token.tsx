import { createFileRoute } from '@tanstack/react-router';
import { meetingPathOfLink } from '@/features/teaching/classroom/join/staff-link';
import { StaffLinkGate } from '@/features/teaching/classroom/join/StaffLinkGate';
import { MeetingGuestPage } from '@/features/teaching/meetings/MeetingGuestPage';

/** Outside every guard; a signed-in staff member is sent to /meeting/<id> with their role. */
export const Route = createFileRoute('/(public)/m/$token')({ component: MeetingLinkRoute });

function MeetingLinkRoute() {
  const { token } = Route.useParams();
  return (
    <StaffLinkGate linkKey={token} resolve={() => meetingPathOfLink(token)}>
      <MeetingGuestPage token={token} />
    </StaffLinkGate>
  );
}
