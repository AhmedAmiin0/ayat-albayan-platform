import { createFileRoute } from '@tanstack/react-router';
import { FeedbackPage } from '@/features/feedback/FeedbackPage';

/** /admin/feedback «رأيك يهمّنا» — what the students said, with each teacher's average. */
export const Route = createFileRoute('/admin/feedback')({ component: FeedbackPage });
