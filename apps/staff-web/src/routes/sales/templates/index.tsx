import { createFileRoute } from '@tanstack/react-router';
import { AuthorTemplatesPage } from '@/features/messaging/templates';

/** /sales/templates «القوالب» (owner 2026-11-14): allow-list, new templates, edits. */
export const Route = createFileRoute('/sales/templates/')({ component: AuthorTemplatesPage });
