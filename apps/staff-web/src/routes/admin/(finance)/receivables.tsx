import { createFileRoute } from '@tanstack/react-router';
import { ReceivablesPage } from '@/features/finance/finance/ReceivablesPage';

export const Route = createFileRoute('/admin/(finance)/receivables')({ component: ReceivablesPage });
