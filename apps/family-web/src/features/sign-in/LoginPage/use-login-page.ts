import { useCodesOpen } from '@ab/web-kit';

export function useLoginPage() {
  const codes = useCodesOpen('family');
  return { codes };
}
