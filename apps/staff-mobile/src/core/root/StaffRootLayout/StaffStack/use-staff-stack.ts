import { useBootMark, useMeId, useMeReady, useProfileLocaleSync } from '@ab/mobile-kit';
import { usePresenceSelf } from '@/core/lib/presence';
import type { StaffStackProps } from './StaffStack.types';

/** Signed-in trees mount only once /auth/me is loaded so the tab bar renders complete (docs/27). */
export function useStaffStack({ gate, settled }: Pick<StaffStackProps, 'gate' | 'settled'>) {
  const signedIn = gate !== 'booting' && gate !== 'out';
  const meReady = useMeReady(signedIn);
  const ready = settled && meReady;
  useBootMark(ready);
  // Online now for the others (docs/33 §1.1), in every tree, while the app is open.
  usePresenceSelf(useMeId(ready && signedIn));
  // The login's language (/auth/me `locale`) wins over this phone's copy: a switch reloads.
  useProfileLocaleSync(signedIn);
  return { signedIn, ready, interactive: ready && signedIn };
}
