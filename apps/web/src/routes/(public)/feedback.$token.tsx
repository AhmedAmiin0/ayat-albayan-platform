import { createFileRoute } from '@tanstack/react-router';
import { FeedbackPublicPage } from '@/features/teaching/feedback/public/FeedbackPublicPage';

/** /feedback/:token — «رأيك يهمّنا» for the guardian. Outside the admin and teacher guards: no login. */
export const Route = createFileRoute('/(public)/feedback/$token')({ component: FeedbackRoute });

function FeedbackRoute() {
  const { token } = Route.useParams();
  return <FeedbackPublicPage token={token} />;
}
