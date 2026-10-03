import { createFileRoute } from '@tanstack/react-router';
import { MyFeedback } from '@/features/teacher/MyFeedback';

/** /teacher/feedback «آراء الطلاب» — what my students said, and my average. */
export const Route = createFileRoute('/teacher/feedback')({ component: MyFeedback });
