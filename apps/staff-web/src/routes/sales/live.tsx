import { createFileRoute } from '@tanstack/react-router';
import { SalesLive } from '@/features/sales/sales/live/SalesLive';

/** /sales/live «الحلقات الجارية» — the lessons running now, each with «ادخل الحلقة» (docs/16). */
export const Route = createFileRoute('/sales/live')({ component: SalesLive });
