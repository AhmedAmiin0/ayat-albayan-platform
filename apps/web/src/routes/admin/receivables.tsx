import { createFileRoute } from '@tanstack/react-router';
import { ReceivablesPage } from '@/features/finance/ReceivablesPage';

/** /admin/receivables — «مستحق على الطلاب»: who owes, how much, how long (aging). */
export const Route = createFileRoute('/admin/receivables')({ component: ReceivablesPage });
