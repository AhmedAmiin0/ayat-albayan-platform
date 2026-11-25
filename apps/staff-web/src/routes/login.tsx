import { createFileRoute } from '@tanstack/react-router';
import { parseReturnSearch } from '@/features/people/auth';
import { LoginPage } from '@/features/people/auth/LoginPage';

/** ?redirect=<same-origin path>: where to land after sign-in. */
export const Route = createFileRoute('/login')({
  validateSearch: parseReturnSearch,
  component: LoginPage,
});
