import { useDevicePush } from '@/account/use-device-push';

export function usePushSwitchRow() {
  const push = useDevicePush();
  return { push };
}
