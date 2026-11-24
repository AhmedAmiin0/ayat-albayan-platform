import { createFileRoute } from '@tanstack/react-router';
import { FinanceSummaryPage } from '@/features/finance/finance/FinanceSummaryPage';

/** A year's revenue minus teacher cost minus expenses by month, converted. */
export const Route = createFileRoute('/admin/(finance)/finance')({ component: FinanceSummaryPage });
