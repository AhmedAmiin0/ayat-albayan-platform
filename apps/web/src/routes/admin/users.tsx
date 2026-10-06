import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/features/users/UsersPage';

/** /admin/users «المستخدمون» (users.read; the /admin layout checks it before loading). */
export const Route = createFileRoute('/admin/users')({ component: UsersPage });
