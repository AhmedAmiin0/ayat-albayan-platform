import { createFileRoute } from '@tanstack/react-router';
import { SalesMeetings } from '@/features/sales/SalesMeetings';

/** /sales/meetings «الاجتماعات» — instant and scheduled internal meetings with invitations (owner 2026-10-12). */
export const Route = createFileRoute('/sales/meetings')({ component: SalesMeetings });
