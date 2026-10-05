import { createFileRoute } from '@tanstack/react-router';
import { MyPayouts } from '@/features/teacher/MyPayouts';

/** /teacher/payouts «كشوف الشهر» — my monthly statements (R-TCH-04). */
export const Route = createFileRoute('/teacher/payouts')({ component: MyPayouts });
