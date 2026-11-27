import { useMeReady, useProfileLocaleSync } from '@ab/mobile-kit';
import { useFamilyCodes } from '@/sign-in';
import { isFamilySignedIn } from '@/root/family-gate';
import { useFamilyPush } from '@/root/use-family-push';
import type { FamilyStackProps } from './FamilyStack.types';

export function useFamilyStack({ gate, boot }: FamilyStackProps) {
  const signedIn = isFamilySignedIn(gate);
  // Inside the query provider: the persisted /auth/me counts (docs/27 E2).
  const meReady = useMeReady(signedIn);
  // Signed out, the sign-in opens on WhatsApp or the password by GET /auth/code/status: the cover
  // waits for it, so the first screen is whole when it materializes (no form popping in).
  const codesKnown = useFamilyCodes() !== undefined;
  const ready = boot.settled && meReady && (signedIn || codesKnown);
  useFamilyPush(ready && signedIn);
  // The login's own language (profiles.locale): a different one switches the app (reload).
  useProfileLocaleSync(ready && signedIn);
  return { signedIn, ready };
}
