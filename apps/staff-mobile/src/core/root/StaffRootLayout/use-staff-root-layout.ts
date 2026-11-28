import { useAuthGate, useRootBoot } from '@ab/mobile-kit';
import { useClearInboxOnSignOut } from '@/core/root/use-clear-inbox-on-sign-out';

export function useStaffRootLayout() {
  const gate = useAuthGate();
  const boot = useRootBoot(gate);
  useClearInboxOnSignOut(gate);
  return { gate, boot };
}
