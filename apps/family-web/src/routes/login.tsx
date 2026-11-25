import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/features/sign-in';
import { parseReturnSearch } from '@ab/web-kit';

/** ?redirect=<same-origin path>: where to land after sign-in. */
export const Route = createFileRoute('/login')({
  validateSearch: parseReturnSearch,
  component: LoginPage,
});
