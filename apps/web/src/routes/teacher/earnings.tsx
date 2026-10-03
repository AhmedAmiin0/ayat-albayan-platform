import { createFileRoute } from '@tanstack/react-router';
import { MyEarnings } from '@/features/teacher-earnings/MyEarnings';

/** /teacher/earnings «مستحقاتي» — what I earned per lesson, what was paid, what is left. */
export const Route = createFileRoute('/teacher/earnings')({ component: MyEarnings });
