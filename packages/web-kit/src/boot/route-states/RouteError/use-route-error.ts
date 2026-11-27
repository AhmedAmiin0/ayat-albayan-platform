import { useRouter } from '@tanstack/react-router';
import type { RouteErrorProps } from './RouteError.types';

export function useRouteError({ home }: Pick<RouteErrorProps, 'home'>) {
  const router = useRouter();
  const retry = () => void router.invalidate();
  const goHome = () => void router.navigate({ href: home });
  return { retry, goHome };
}
