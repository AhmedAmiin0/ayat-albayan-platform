import { useChildSwitch } from '@/nav';

export function useChildSwitchSheet() {
  const { open } = useChildSwitch();
  return { open };
}
