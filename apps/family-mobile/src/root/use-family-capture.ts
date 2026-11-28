import type { FamilyPick } from '@ab/client-core';
import { useIsTestAccount, usePreventCapture } from '@ab/mobile-kit';
import { canSkip } from '@ab/shared';
import { useFamilyPick } from '@/portal';

const isTestChild = (pick: FamilyPick): boolean =>
  pick.state === 'one' && pick.student.is_test === true;

/**
 * Screenshots and screen recording are blocked in the whole family app from launch. Only a test
 * profile viewing a test child may capture (docs/56 `screen_capture`); while either is unknown
 * (booting, signed out, no child chosen) the block stays on.
 */
export function useFamilyCapture(signedIn: boolean): void {
  const userIsTest = useIsTestAccount(signedIn);
  const pick = useFamilyPick(signedIn);
  const studentIsTest = signedIn && isTestChild(pick);
  usePreventCapture(!canSkip('screen_capture', { userIsTest, studentIsTest }));
}
