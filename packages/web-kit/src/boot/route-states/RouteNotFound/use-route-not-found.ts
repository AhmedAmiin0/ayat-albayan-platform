import { useRouter } from '@tanstack/react-router';
import type { RouteNotFoundProps } from './RouteNotFound.types';

export function useRouteNotFound({ home }: Pick<RouteNotFoundProps, 'home'>) {
  const router = useRouter();
  const goHome = () => void router.navigate({ href: home });
  return { goHome };
}
