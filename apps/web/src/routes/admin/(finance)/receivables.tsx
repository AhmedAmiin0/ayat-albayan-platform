import { createFileRoute } from '@tanstack/react-router';
import { ReceivablesPage } from '@/features/finance/finance/ReceivablesPage';

/** /admin/receivables — «مستحق على الطلاب»: who owes, how much, how long (aging). */
export const Route = createFileRoute('/admin/(finance)/receivables')({ component: ReceivablesPage });
