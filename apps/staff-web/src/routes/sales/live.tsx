import { createFileRoute } from '@tanstack/react-router';
import { SalesLive } from '@/features/sales/sales/live/SalesLive';

export const Route = createFileRoute('/sales/live')({ component: SalesLive });
