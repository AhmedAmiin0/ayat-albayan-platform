import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@ab/web-kit/auth/me';

export function useMeTestChip() {
  const me = useQuery(meQuery);
  return { me };
}
