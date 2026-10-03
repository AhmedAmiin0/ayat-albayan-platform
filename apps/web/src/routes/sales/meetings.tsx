import { createFileRoute } from '@tanstack/react-router';
import { SalesMeetings } from '@/features/sales/SalesMeetings';

/** /sales/meetings «مواعيدي» — my meetings by day, with «ادخل الحلقة». */
export const Route = createFileRoute('/sales/meetings')({ component: SalesMeetings });
