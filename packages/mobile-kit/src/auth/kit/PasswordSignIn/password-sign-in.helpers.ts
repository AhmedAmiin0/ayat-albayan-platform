import type { Check } from './PasswordSignIn.types';

/** What is wrong with the typed identifier by the app's own check, or null (nothing typed). */
export const typoOf = (typed: string, check: Check | undefined): string | null =>
  typed === '' || !check ? null : check(typed);

export const ignore = (_ok: boolean) => undefined;
