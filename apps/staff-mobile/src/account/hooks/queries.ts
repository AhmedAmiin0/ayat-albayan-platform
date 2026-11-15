import type { AccountProfile } from '@ab/shared';
import { locale } from '@ab/mobile-kit';

/** The held role's name in the app's language (the other language, then nothing, as fallbacks). */
export function roleLabel(profile: AccountProfile): string | null {
  const { name_ar, name_en } = profile.role;
  return (locale === 'en' ? name_en ?? name_ar : name_ar ?? name_en) ?? null;
}
