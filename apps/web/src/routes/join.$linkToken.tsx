import { createFileRoute } from '@tanstack/react-router';
import { GuestJoinPage } from '@/features/classroom/join/GuestJoinPage';
import { lessonPathOfLink } from '@/features/classroom/join/staff-link';
import { StaffLinkGate } from '@/features/classroom/join/StaffLinkGate';

/**
 * /join/:linkToken: the family's lesson link. Outside every guard: no login, no app shell. The
 * lesson's own staff, signed in, are sent to /classroom/<lesson> to join with their own role.
 */
export const Route = createFileRoute('/join/$linkToken')({ component: JoinRoute });

function JoinRoute() {
  const { linkToken } = Route.useParams();
  return (
    <StaffLinkGate linkKey={linkToken} resolve={() => lessonPathOfLink(linkToken)}>
      <GuestJoinPage linkToken={linkToken} />
    </StaffLinkGate>
  );
}
