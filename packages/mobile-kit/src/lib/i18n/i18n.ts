import { cloneBundle } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { locale } from './locale';

/**
 * UI strings (rule 10) in the language this run booted in (lib/locale). Never hard-code text in
 * screens. `t` is a copy of the bundle: app/_layout writes the admins' translation overrides into
 * it (lib/i18n-overrides) before the first screen renders.
 */
export const t: typeof ar = cloneBundle(locale === 'en' ? en : ar);
