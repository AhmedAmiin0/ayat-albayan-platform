import { useTabBarInset } from '@ab/mobile-kit';
import { useChildSwitch } from '@/nav/switch-store';

export function useSwitchNotice() {
  const { notice } = useChildSwitch();
  const bottom = useTabBarInset() + 12;
  return { notice, bottom };
}
