import { useRouter } from '@tanstack/react-router';

export function useRouteError() {
  const router = useRouter();
  return { router };
}
