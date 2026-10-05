import { createFileRoute } from '@tanstack/react-router';
import { InvoicesPage } from '@/features/finance/InvoicesPage';

/** /admin/invoices — every booking invoice (R-PAY-03), «سجّل كدفعة» from one. */
export const Route = createFileRoute('/admin/invoices')({ component: InvoicesPage });
