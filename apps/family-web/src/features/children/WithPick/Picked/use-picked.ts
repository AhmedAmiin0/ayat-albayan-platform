import { useFamilyPick } from '@/features/shell';

export function usePicked() {
  const pick = useFamilyPick();
  return { pick };
}
