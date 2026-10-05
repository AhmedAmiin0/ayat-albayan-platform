import { createFileRoute } from '@tanstack/react-router';
import { RolesPage } from '@/features/roles/RolesPage';

/** /admin/roles «الأدوار والصلاحيات» (roles.manage; the /admin layout checks it before loading). */
export const Route = createFileRoute('/admin/roles')({ component: RolesPage });
