import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { locale } from './locale';

/**
 * UI strings (rule 10) in the language chosen at boot (lib/locale); en.json has ar.json's key tree
 * (packages/shared i18n-parity test). Never hard-code text in components.
 */
export const t: typeof ar = locale === 'en' ? en : ar;
