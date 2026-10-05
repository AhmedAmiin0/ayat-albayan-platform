import { createFileRoute } from '@tanstack/react-router';
import { SalesSubscriptions } from '@/features/sales/SalesSubscriptions';

/** /sales/subscriptions «الاشتراكات» — pending and confirmed, two separate lists. */
export const Route = createFileRoute('/sales/subscriptions')({ component: SalesSubscriptions });
