import { createFileRoute } from '@tanstack/react-router';
import { MyPayouts } from '@/features/teacher/MyPayouts';

/** /teacher/payouts «مستحقاتي» — my payouts history (R-TCH-04). */
export const Route = createFileRoute('/teacher/payouts')({ component: MyPayouts });
