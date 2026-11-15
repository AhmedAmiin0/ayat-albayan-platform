import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/features/sign-in';
import { parseReturnSearch } from '@ab/web-kit/auth/return-to';

/** ?redirect=<same-origin path>: where to land after sign-in (owner 2026-11-14). */
export const Route = createFileRoute('/login')({
  validateSearch: parseReturnSearch,
  component: LoginPage,
});
