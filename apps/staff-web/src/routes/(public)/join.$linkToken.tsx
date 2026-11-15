import { createFileRoute } from '@tanstack/react-router';
import { GuestJoinPage } from '@/features/teaching/classroom/join/GuestJoinPage';
import { lessonPathOfLink } from '@/features/teaching/classroom/join/staff-link';
import { StaffLinkGate } from '@/features/teaching/classroom/join/StaffLinkGate';

/**
 * /join/:linkToken: the family's lesson link. Outside every guard: no login, no app shell. The
 * lesson's own staff, signed in, are sent to /classroom/<lesson> to join with their own role.
 */
export const Route = createFileRoute('/(public)/join/$linkToken')({ component: JoinRoute });

function JoinRoute() {
  const { linkToken } = Route.useParams();
  return (
    <StaffLinkGate linkKey={linkToken} resolve={() => lessonPathOfLink(linkToken)}>
      <GuestJoinPage linkToken={linkToken} />
    </StaffLinkGate>
  );
}
