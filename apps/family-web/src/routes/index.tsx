import { createFileRoute, redirect } from '@tanstack/react-router';

/** The family host's root is the home (the manifest's start_url is /portal too). */
export const Route = createFileRoute('/')({
  beforeLoad: () => redirect({ to: '/portal', throw: true }),
});
