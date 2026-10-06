import { createFileRoute } from '@tanstack/react-router';
import { MyEarnings } from '@/features/sales/MyEarnings';

/** /sales/earnings «أرباحي» — my salary, commissions and monthly statements, read-only. */
export const Route = createFileRoute('/sales/earnings')({ component: MyEarnings });
