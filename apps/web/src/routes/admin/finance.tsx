import { createFileRoute } from '@tanstack/react-router';
import { FinanceSummaryPage } from '@/features/finance/FinanceSummaryPage';

/** /admin/finance — «الملخص المالي»: a year's revenue − teacher cost − expenses by month, converted. */
export const Route = createFileRoute('/admin/finance')({ component: FinanceSummaryPage });
