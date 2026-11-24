import { createFileRoute } from '@tanstack/react-router';
import { FeedbackPublicPage } from '@/features/teaching/feedback/public/FeedbackPublicPage';

/** Guardian feedback page outside the admin and teacher guards: no login. */
export const Route = createFileRoute('/(public)/feedback/$token')({ component: FeedbackRoute });

function FeedbackRoute() {
  const { token } = Route.useParams();
  return <FeedbackPublicPage token={token} />;
}
