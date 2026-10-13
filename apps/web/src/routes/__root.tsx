import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { AppError } from '@/components/shell/AppError';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  // No other route has an errorComponent, so a failing section beforeLoad (e.g. /auth/me down)
  // or page bubbles up to this one boundary: the app's error screen with retry and sign-out.
  errorComponent: AppError,
});
