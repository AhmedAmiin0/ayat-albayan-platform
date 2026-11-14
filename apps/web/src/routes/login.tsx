import { createFileRoute } from '@tanstack/react-router';
import { parseReturnSearch } from '@/features/people/auth';
import { LoginPage } from '@/features/people/auth/LoginPage';

/** ?redirect=<same-origin path>: where to land after sign-in (owner 2026-11-14). */
export const Route = createFileRoute('/login')({
  validateSearch: parseReturnSearch,
  component: LoginPage,
});
