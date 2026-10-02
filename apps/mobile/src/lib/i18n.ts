import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { locale } from './locale';

/** UI strings (rule 10) in the language this run booted in (lib/locale). Never hard-code text in screens. */
export const t: typeof ar = locale === 'en' ? en : ar;
