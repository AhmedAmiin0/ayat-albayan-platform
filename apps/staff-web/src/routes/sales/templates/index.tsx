import { createFileRoute } from '@tanstack/react-router';
import { AuthorTemplatesPage } from '@/features/messaging/templates';

export const Route = createFileRoute('/sales/templates/')({ component: AuthorTemplatesPage });
