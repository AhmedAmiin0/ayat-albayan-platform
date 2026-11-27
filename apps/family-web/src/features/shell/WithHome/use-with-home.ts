import { usePortalHome } from '@/features/shell/use-portal-home';

export function useWithHome() {
  const portalHome = usePortalHome();
  return { portalHome };
}
