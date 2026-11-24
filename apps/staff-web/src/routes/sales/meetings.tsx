import { createFileRoute } from '@tanstack/react-router';
import { SalesMeetings } from '@/features/sales/sales/live/SalesMeetings';

export const Route = createFileRoute('/sales/meetings')({ component: SalesMeetings });
