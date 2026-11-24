import { createFileRoute } from '@tanstack/react-router';
import { RolesPage } from '@/features/people/roles/RolesPage';

/** Needs roles.manage; the /admin layout checks it before loading. */
export const Route = createFileRoute('/admin/(people)/roles')({ component: RolesPage });
