import { createFileRoute } from '@tanstack/react-router';
import { MeetingGuestPage } from '@/features/meetings/MeetingGuestPage';

/** /m/:token: an internal meeting's link («اجتماع داخلي»). Outside every guard: no login, no app shell. */
export const Route = createFileRoute('/m/$token')({ component: MeetingLinkRoute });

function MeetingLinkRoute() {
  const { token } = Route.useParams();
  return <MeetingGuestPage token={token} />;
}
