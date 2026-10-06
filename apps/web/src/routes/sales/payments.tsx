import { createFileRoute } from '@tanstack/react-router';
import { MyPayments } from '@/features/sales/MyPayments';

/** /sales/payments «مدفوعاتي» — only the payments I recorded. */
export const Route = createFileRoute('/sales/payments')({ component: MyPayments });
