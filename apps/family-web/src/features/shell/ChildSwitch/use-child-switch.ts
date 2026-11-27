import { usePickedChild } from '@/features/shell/use-family-pick';

export function useChildSwitch() {
  const child = usePickedChild();
  return { child };
}
