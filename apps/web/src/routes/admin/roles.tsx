import { createFileRoute } from '@tanstack/react-router';
import { RolesPage } from '@/features/roles/RolesPage';

/** /admin/roles «الأدوار والصلاحيات»: custom roles and their permission matrix. No nav entry yet. */
export const Route = createFileRoute('/admin/roles')({
  component: RolesPage,
});
