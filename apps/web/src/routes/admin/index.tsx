import { createFileRoute } from '@tanstack/react-router';
import { AdminHome } from '@/components/shell/AdminHome';

export const Route = createFileRoute('/admin/')({ component: AdminHome });
