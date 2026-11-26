import { useSignOut } from '@/features/account/use-sign-out';

export function useAccountPage() {
  const out = useSignOut();
  return { out };
}
