import type { CodesSide } from '@ab/client-core';
import { useCodesOpen } from '@ab/web-kit/auth/login/use-codes-open';

export function useCodesGate(side: CodesSide) {
  const open = useCodesOpen(side);
  return { open };
}
