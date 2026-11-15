import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/features/people/users/UsersPage';

/** /admin/users «المستخدمون» (users.read; the /admin layout checks it before loading). */
export const Route = createFileRoute('/admin/(people)/users')({ component: UsersPage });
