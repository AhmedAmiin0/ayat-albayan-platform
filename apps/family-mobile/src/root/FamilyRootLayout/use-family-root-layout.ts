import { useAuthGate, useRootBoot } from '@ab/mobile-kit';

export function useFamilyRootLayout() {
  const gate = useAuthGate();
  return { gate, boot: useRootBoot(gate) };
}
