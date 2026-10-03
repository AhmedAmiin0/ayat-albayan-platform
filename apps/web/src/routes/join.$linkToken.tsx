import { createFileRoute } from '@tanstack/react-router';
import { GuestJoinPage } from '@/features/classroom/GuestJoinPage';

/** /join/:linkToken: the family's lesson link. Outside every guard: no login, no app shell. */
export const Route = createFileRoute('/join/$linkToken')({ component: JoinRoute });

function JoinRoute() {
  const { linkToken } = Route.useParams();
  return <GuestJoinPage linkToken={linkToken} />;
}
