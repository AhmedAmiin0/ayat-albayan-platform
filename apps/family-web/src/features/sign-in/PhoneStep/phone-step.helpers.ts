import type { PhoneState } from '@ab/client-core';
import { t } from '@ab/web-kit';

/** The line under the number while it is typed: the hint, or why it cannot be a number. */
export const UNDER: Readonly<Record<PhoneState, () => string | undefined>> = {
  empty: () => undefined,
  typing: () => undefined,
  ok: () => undefined,
  bad: () => t.familyApp.signIn.phoneBad,
};
